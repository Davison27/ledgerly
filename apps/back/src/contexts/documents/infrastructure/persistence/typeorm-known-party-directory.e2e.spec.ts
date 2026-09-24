import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from '../../../../database/migrations/1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from '../../../../database/migrations/1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from '../../../../database/migrations/1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from '../../../../database/migrations/1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from '../../../../database/migrations/1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from '../../../../database/migrations/1730000005000-AddReferentialIntegrity';
import { NormalizeDerivedColumns1730000006000 } from '../../../../database/migrations/1730000006000-NormalizeDerivedColumns';
import { AdoptEnglishControlledValues1730000007000 } from '../../../../database/migrations/1730000007000-AdoptEnglishControlledValues';
import { NormalizeTaxIdsAndEnforceUniqueness1730000008000 } from '../../../../database/migrations/1730000008000-NormalizeTaxIdsAndEnforceUniqueness';
import { PreserveWorkspaceMemberAuditIdentity1730000009000 } from '../../../../database/migrations/1730000009000-PreserveWorkspaceMemberAuditIdentity';
import { RemoveProjectFiscalYear1730000010000 } from '../../../../database/migrations/1730000010000-RemoveProjectFiscalYear';
import { RequireProjectClient1730000011000 } from '../../../../database/migrations/1730000011000-RequireProjectClient';
import { CreateReleaseNoteAcknowledgements1730000012000 } from '../../../../database/migrations/1730000012000-CreateReleaseNoteAcknowledgements';
import { ConvertWorkspaceMemberRoles1730000013000 } from '../../../../database/migrations/1730000013000-ConvertWorkspaceMemberRoles';
import { AddInvoiceHintIssuerTaxId1730000014000 } from '../../../../database/migrations/1730000014000-AddInvoiceHintIssuerTaxId';
import { TypeOrmKnownPartyDirectory } from './typeorm-known-party-directory';

describe('TypeOrmKnownPartyDirectory (PostgreSQL)', () => {
  let administrator: DataSource;
  let dataSource: DataSource;
  let schema: string;
  let directory: TypeOrmKnownPartyDirectory;

  beforeAll(async () => {
    const databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_known_party_directory_${randomUUID().replaceAll('-', '')}`;
    administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      migrations: [
        InitialLedgerlySchema1730000000000,
        AddListQueryIndexes1730000001000,
        AddEncryptedStoredFileEnvelopes1730000002000,
        ReconcileEntitySchemaDrift1730000003000,
        AddMissingUniqueConstraints1730000004000,
        AddReferentialIntegrity1730000005000,
        NormalizeDerivedColumns1730000006000,
        AdoptEnglishControlledValues1730000007000,
        NormalizeTaxIdsAndEnforceUniqueness1730000008000,
        PreserveWorkspaceMemberAuditIdentity1730000009000,
        RemoveProjectFiscalYear1730000010000,
        RequireProjectClient1730000011000,
        CreateReleaseNoteAcknowledgements1730000012000,
        ConvertWorkspaceMemberRoles1730000013000,
        AddInvoiceHintIssuerTaxId1730000014000,
      ],
      migrationsTransactionMode: 'each',
      extra: { max: 1, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });

    directory = new TypeOrmKnownPartyDirectory(dataSource);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM suppliers');
    await dataSource.query('DELETE FROM companies');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (administrator?.isInitialized) {
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('returns null when no company row exists', async () => {
    await expect(directory.findCompanyTaxId()).resolves.toBeNull();
  });

  it('returns the canonical company tax id, dropping a stored ES prefix', async () => {
    await dataSource.query(`INSERT INTO companies (id, name, tax_id) VALUES ($1, 'My Company', 'ESB12345674')`, [
      randomUUID(),
    ]);

    await expect(directory.findCompanyTaxId()).resolves.toBe('B12345674');
  });

  it('finds an active supplier by its exact stored tax id', async () => {
    await dataSource.query(`INSERT INTO suppliers (id, name, tax_id) VALUES ($1, 'Comercial Rapido SL', 'B28374650')`, [
      randomUUID(),
    ]);

    await expect(directory.findActiveSupplierByTaxId('B28374650')).resolves.toEqual({
      name: 'Comercial Rapido SL',
      taxId: 'B28374650',
    });
  });

  it('finds an active supplier stored with an ES prefix when queried by the canonical id', async () => {
    await dataSource.query(
      `INSERT INTO suppliers (id, name, tax_id) VALUES ($1, 'Comercial Rapido y Distribucion SL', 'ESB28374650')`,
      [randomUUID()],
    );

    await expect(directory.findActiveSupplierByTaxId('B28374650')).resolves.toEqual({
      name: 'Comercial Rapido y Distribucion SL',
      taxId: 'ESB28374650',
    });
  });

  it('ignores an archived supplier', async () => {
    await dataSource.query(
      `INSERT INTO suppliers (id, name, tax_id, archived_at) VALUES ($1, 'Archived Supplier SL', 'B28374650', CURRENT_TIMESTAMP)`,
      [randomUUID()],
    );

    await expect(directory.findActiveSupplierByTaxId('B28374650')).resolves.toBeNull();
  });

  it('returns null when no supplier matches the tax id', async () => {
    await expect(directory.findActiveSupplierByTaxId('B28374650')).resolves.toBeNull();
  });
});

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid migration test database URL');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid migration test database URL');
  }

  if (
    (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') ||
    (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') ||
    url.port.length === 0 ||
    url.pathname !== '/ledgerly_migration_test' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error('Invalid migration test database URL');
  }

  return value;
}
