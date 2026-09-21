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

const baseMigrations: Array<new () => MigrationInterface> = [
  InitialLedgerlySchema1730000000000,
  AddListQueryIndexes1730000001000,
  AddEncryptedStoredFileEnvelopes1730000002000,
  ReconcileEntitySchemaDrift1730000003000,
  AddMissingUniqueConstraints1730000004000,
  AddReferentialIntegrity1730000005000,
  NormalizeDerivedColumns1730000006000,
  AdoptEnglishControlledValues1730000007000,
];

const clients = [
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000802',
  '00000000-0000-0000-0000-000000000803',
] as const;
const suppliers = [
  '00000000-0000-0000-0000-000000000811',
  '00000000-0000-0000-0000-000000000812',
  '00000000-0000-0000-0000-000000000813',
] as const;
const archivedClientId = '00000000-0000-0000-0000-000000000804';
const archivedSupplierId = '00000000-0000-0000-0000-000000000814';

describe('NormalizeTaxIdsAndEnforceUniqueness1730000008000', () => {
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

    dataSource = createDataSource(testDatabaseUrl, schema);
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
    await insertFixtures(dataSource);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();

    if (schema && testDatabaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('canonicalizes IDs, preserves archived conflicts, and allows repeatable nulls', async () => {
    await dataSource.query(
      `INSERT INTO clients (id, name, tax_id, archived_at)
       VALUES ($1, 'Archived client', 'X-9', CURRENT_TIMESTAMP)`,
      [archivedClientId],
    );
    await dataSource.query(
      `INSERT INTO suppliers (id, name, tax_id, archived_at)
       VALUES ($1, 'Archived supplier', 'X.10', CURRENT_TIMESTAMP)`,
      [archivedSupplierId],
    );
    await invokeMigration('up');

    await expect(dataSource.query(
      'SELECT tax_id AS "taxId", archived_at IS NOT NULL AS "archived" FROM clients WHERE id = ANY($1) ORDER BY id',
      [clients],
    )).resolves.toEqual([
      { taxId: 'ESB12345678', archived: false },
      { taxId: null, archived: false },
      { taxId: null, archived: false },
    ]);
    await expect(dataSource.query(
      'SELECT tax_id AS "taxId", archived_at IS NOT NULL AS "archived" FROM suppliers WHERE id = $1',
      [archivedSupplierId],
    )).resolves.toEqual([{ taxId: 'X10', archived: true }]);
    await expect(dataSource.query(
      'SELECT tax_id AS "taxId", archived_at IS NOT NULL AS "archived" FROM suppliers WHERE id = ANY($1) ORDER BY id',
      [suppliers],
    )).resolves.toEqual([
      { taxId: 'ESB12345678', archived: false },
      { taxId: null, archived: false },
      { taxId: null, archived: false },
    ]);

    await expect(dataSource.query(
      `INSERT INTO clients (id, name, tax_id)
       VALUES ('00000000-0000-0000-0000-000000000805', 'Duplicate client', 'X9')`,
    )).rejects.toThrow();
    await expect(dataSource.query(
      `INSERT INTO suppliers (id, name, tax_id)
       VALUES ('00000000-0000-0000-0000-000000000815', 'Duplicate supplier', 'X10')`,
    )).rejects.toThrow();
    await expect(dataSource.query(
      `INSERT INTO clients (id, name, tax_id)
       VALUES ('00000000-0000-0000-0000-000000000806', 'Blank client', '')`,
    )).resolves.toBeDefined();
  });

  it('enforces named per-table uniqueness after canonicalization', async () => {
    await invokeMigration('up');

    await expect(dataSource.query(
      `INSERT INTO clients (id, name, tax_id)
       VALUES ('00000000-0000-0000-0000-000000000807', 'Duplicate client', 'ESB12345678')`,
    )).rejects.toThrow();
    await expect(dataSource.query(
      `INSERT INTO suppliers (id, name, tax_id)
       VALUES ('00000000-0000-0000-0000-000000000817', 'Duplicate supplier', 'ESB12345678')`,
    )).rejects.toThrow();
  });

  it('rejects duplicate preflight without mutating data or creating indexes', async () => {
    await dataSource.query(
      `INSERT INTO clients (id, name, tax_id)
       VALUES
         ('00000000-0000-0000-0000-000000000808', 'Conflict one', 'DUP-1'),
         ('00000000-0000-0000-0000-000000000809', 'Conflict two', 'DUP.1')`,
    );

    await expect(invokeMigration('up')).rejects.toThrow(/clients\.DUP1/);

    await expect(dataSource.query(
      `SELECT tax_id AS "taxId" FROM clients
       WHERE id = ANY($1) ORDER BY id`,
      [['00000000-0000-0000-0000-000000000808', '00000000-0000-0000-0000-000000000809']],
    )).resolves.toEqual([{ taxId: 'DUP-1' }, { taxId: 'DUP.1' }]);
    await expect(dataSource.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)`,
      [['UQ_clients_tax_id', 'UQ_suppliers_tax_id']],
    )).resolves.toHaveLength(0);
  });

  it('drops and recreates both indexes while retaining canonicalized values', async () => {
    await invokeMigration('up');
    await invokeMigration('down');

    await expect(dataSource.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)`,
      [['UQ_clients_tax_id', 'UQ_suppliers_tax_id']],
    )).resolves.toHaveLength(0);
    await expect(dataSource.query(
      'SELECT tax_id FROM clients WHERE id = $1',
      [clients[0]],
    )).resolves.toEqual([{ tax_id: 'ESB12345678' }]);

    await invokeMigration('up');
    await expect(dataSource.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)
       ORDER BY indexname`,
      [['UQ_clients_tax_id', 'UQ_suppliers_tax_id']],
    )).resolves.toEqual([{ indexname: 'UQ_clients_tax_id' }, { indexname: 'UQ_suppliers_tax_id' }]);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new NormalizeTaxIdsAndEnforceUniqueness1730000008000();
      if (direction === 'up') await migration.up(queryRunner);
      else await migration.down(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
});

async function insertFixtures(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO clients (id, name, tax_id)
     VALUES
       ($1, 'Formatted client', ' es-b.123-456 78 '),
       ($2, 'Blank client one', ' .- '),
       ($3, 'Blank client two', '')`,
    [...clients],
  );
  await dataSource.query(
    `INSERT INTO suppliers (id, name, tax_id)
     VALUES
       ($1, 'Formatted supplier', ' es-b.123-456 78 '),
       ($2, 'Blank supplier one', ' .- '),
       ($3, 'Blank supplier two', '')`,
    [...suppliers],
  );
}

function createDataSource(testDatabaseUrl: string, schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations: baseMigrations,
    migrationsTransactionMode: 'each',
    extra: { max: 1, options: `-c search_path=${schema},public` },
  });
}

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid migration test database URL');

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
