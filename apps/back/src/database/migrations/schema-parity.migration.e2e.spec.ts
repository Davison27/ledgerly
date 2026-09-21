import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, MigrationInterface } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from './1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from './1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from './1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from './1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from './1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from './1730000005000-AddReferentialIntegrity';
import { NormalizeDerivedColumns1730000006000 } from './1730000006000-NormalizeDerivedColumns';
import { AdoptEnglishControlledValues1730000007000 } from './1730000007000-AdoptEnglishControlledValues';
import { NormalizeTaxIdsAndEnforceUniqueness1730000008000 } from './1730000008000-NormalizeTaxIdsAndEnforceUniqueness';
import { PreserveWorkspaceMemberAuditIdentity1730000009000 } from './1730000009000-PreserveWorkspaceMemberAuditIdentity';
import { RemoveProjectFiscalYear1730000010000 } from './1730000010000-RemoveProjectFiscalYear';
import { RequireProjectClient1730000011000 } from './1730000011000-RequireProjectClient';

const migrations: Array<new () => MigrationInterface> = [
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
];

const encryptedChecks = [
  'CHK_companies_logo_envelope',
  'CHK_companies_logo_bounds',
  'CHK_documents_content_envelope',
  'CHK_documents_content_bounds',
  'CHK_documents_content_metadata_size',
  'CHK_equipment_image_envelope',
  'CHK_equipment_image_bounds',
  'CHK_equipment_documents_content_envelope',
  'CHK_equipment_documents_content_bounds',
  'CHK_equipment_documents_content_metadata_size',
  'CHK_projects_image_envelope',
  'CHK_projects_image_bounds',
  'CHK_staff_documents_content_envelope',
  'CHK_staff_documents_content_bounds',
  'CHK_staff_documents_content_metadata_size',
  'CHK_company_documents_content_envelope',
  'CHK_company_documents_content_bounds',
  'CHK_company_documents_content_metadata_size',
] as const;

describe('entity and migration schema parity', () => {
  let dataSource: DataSource;
  let schema: string;
  let testDatabaseUrl: string;

  beforeEach(async () => {
    testDatabaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);

    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;
    const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = createSchemaParityDataSource(testDatabaseUrl, schema);
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (schema && testDatabaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('produces zero up and down queries between the applied migrations and the entity model', async () => {
    const schemaBuilder = dataSource.driver.createSchemaBuilder();
    const schemaLog = await schemaBuilder.log();

    expect(schemaLog.upQueries).toHaveLength(0);
    expect(schemaLog.downQueries).toHaveLength(0);
  });

  it('applies every U1 unique index', async () => {
    const expectedIndexes = [
      'UQ_notifications_dedupe_key_open',
      'UQ_workspace_members_founder',
      'UQ_workspace_members_email',
      'UQ_workspace_members_google_subject',
      'UQ_staff_document_types_code',
      'UQ_invoice_extraction_hints_issuer_field',
      'UQ_companies_singleton',
      'UQ_clients_tax_id',
      'UQ_suppliers_tax_id',
    ];
    const rows: Array<{ indexname: string }> = await dataSource.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ANY($1) ORDER BY indexname`,
      [expectedIndexes],
    );

    expect(rows.map((row) => row.indexname)).toEqual([...expectedIndexes].sort());
  });

  it('applies workspace audit indexes and removes project fiscal year', async () => {
    const indexRows: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)
       ORDER BY indexname`,
      [['IDX_documents_created_by', 'IDX_documents_deleted_by']],
    );
    const foreignKeyRows: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)
       ORDER BY conname`,
      [['FK_documents_created_by_workspace_member', 'FK_documents_deleted_by_workspace_member']],
    );
    const fiscalYearColumns: Array<{ columnName: string }> = await dataSource.query(
      `SELECT column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'projects'
         AND column_name = 'fiscal_year'`,
    );

    expect(indexRows.map((row) => row.name)).toEqual(['IDX_documents_created_by', 'IDX_documents_deleted_by']);
    expect(foreignKeyRows.map((row) => row.name)).toEqual([
      'FK_documents_created_by_workspace_member',
      'FK_documents_deleted_by_workspace_member',
    ]);
    expect(fiscalYearColumns).toHaveLength(0);
  });

  it('keeps project client ownership mandatory with the named relationship and index', async () => {
    const columns: Array<{ isNullable: string }> = await dataSource.query(
      `SELECT is_nullable AS "isNullable"
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'client_id'`,
    );
    const indexes: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name FROM pg_indexes
       WHERE schemaname = current_schema() AND indexname = 'IDX_projects_client_id'`,
    );
    const foreignKeys: Array<{ name: string; deleteAction: string }> = await dataSource.query(
      `SELECT conname AS name, confdeltype AS "deleteAction"
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = 'FK_projects_client'`,
    );

    expect(columns).toEqual([{ isNullable: 'NO' }]);
    expect(indexes).toEqual([{ name: 'IDX_projects_client_id' }]);
    expect(foreignKeys).toEqual([{ name: 'FK_projects_client', deleteAction: 'r' }]);
  });

  it('preserves all encrypted-envelope checks', async () => {
    const rows: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = ANY($1)
       ORDER BY conname`,
      [encryptedChecks],
    );

    expect(rows.map((row) => row.name)).toEqual([...encryptedChecks].sort());
  });

});

function createSchemaParityDataSource(testDatabaseUrl: string, schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations,
    migrationsTransactionMode: 'each',
    extra: { max: 1, options: `-c search_path=${schema},public` },
  });
}

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
