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

const migrations: Array<new () => MigrationInterface> = [
  InitialLedgerlySchema1730000000000,
  AddListQueryIndexes1730000001000,
  AddEncryptedStoredFileEnvelopes1730000002000,
  ReconcileEntitySchemaDrift1730000003000,
  AddMissingUniqueConstraints1730000004000,
  AddReferentialIntegrity1730000005000,
  NormalizeDerivedColumns1730000006000,
];

const checks = [
  'CHK_documents_type',
  'CHK_documents_direction',
  'CHK_documents_status',
  'CHK_documents_currency',
  'CHK_projects_status',
  'CHK_projects_type',
  'CHK_projects_currency',
  'CHK_notifications_severity',
  'CHK_notifications_resource_kind',
  'CHK_tax_deadline_occurrences_status',
  'CHK_workspace_members_role',
  'CHK_workspace_members_status',
] as const;

const indexes = [
  'IDX_projects_client_id',
  'IDX_project_equipment_lease_expenses_project',
  'IDX_project_equipment_lease_expenses_equipment',
  'UQ_tax_deadline_occurrences_natural',
] as const;

const foreignKeys = [
  ['FK_projects_client', 'r'],
  ['FK_project_equipment_lease_expenses_project', 'r'],
  ['FK_project_equipment_lease_expenses_equipment', 'r'],
] as const;

describe('NormalizeDerivedColumns1730000006000', () => {
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

  it('creates normalized tables, relationships, indexes, columns and domain checks', async () => {
    const tables: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName"
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name IN ('clients', 'project_equipment_lease_expenses')
       ORDER BY table_name`,
    );
    const columns: Array<{ tableName: string; columnName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND (table_name, column_name) IN (
           ('clients', 'id'),
           ('clients', 'name'),
           ('clients', 'tax_id'),
           ('clients', 'contact_name'),
           ('clients', 'contact_email'),
           ('clients', 'contact_phone'),
           ('clients', 'archived_at'),
           ('projects', 'client_id'),
           ('project_equipment_lease_expenses', 'id'),
           ('project_equipment_lease_expenses', 'project_id'),
           ('project_equipment_lease_expenses', 'equipment_id'),
           ('project_equipment_lease_expenses', 'amount'),
           ('project_equipment_lease_expenses', 'expense_date')
         )
       ORDER BY table_name, column_name`,
    );
    const removedColumns: Array<{ tableName: string; columnName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND (table_name, column_name) IN (
           ('projects', 'client_company'),
           ('projects', 'client_tax_id'),
           ('projects', 'contact_name'),
           ('projects', 'contact_email'),
           ('projects', 'contact_phone'),
           ('project_equipment', 'lease_expense'),
           ('project_equipment', 'lease_expense_date'),
           ('tax_deadline_occurrences', 'occurrence_key'),
           ('tax_deadline_occurrences', 'code'),
           ('tax_deadline_occurrences', 'title'),
           ('tax_deadline_occurrences', 'description'),
           ('tax_deadline_occurrences', 'category'),
           ('tax_deadline_occurrences', 'source_url'),
           ('tax_deadline_occurrences', 'source_version'),
           ('documents', 'month')
         )`,
    );
    const indexRows: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)
       ORDER BY indexname`,
      [indexes],
    );
    const foreignKeyRows: Array<{ name: string; deleteAction: string }> = await dataSource.query(
      `SELECT conname AS name, confdeltype AS "deleteAction"
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)
       ORDER BY conname`,
      [foreignKeys.map(([name]) => name)],
    );
    const checkRows: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)
       ORDER BY conname`,
      [checks],
    );

    expect(tables.map((row) => row.tableName)).toEqual(['clients', 'project_equipment_lease_expenses']);
    expect(columns).toHaveLength(13);
    expect(removedColumns).toHaveLength(0);
    expect(indexRows.map((row) => row.name)).toEqual([...indexes].sort());
    expect(foreignKeyRows).toEqual(
      foreignKeys
        .map(([name, deleteAction]) => ({ name, deleteAction }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
    expect(checkRows.map((row) => row.name)).toEqual([...checks].sort());
  });

  it('restores the pre-normalization shape when reverted', async () => {
    await dataSource.undoLastMigration({ transaction: 'each' });

    const tables: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName"
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name IN ('clients', 'project_equipment_lease_expenses')`,
    );
    const restoredColumns: Array<{ tableName: string; columnName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND (table_name, column_name) IN (
           ('projects', 'client_company'),
           ('projects', 'client_tax_id'),
           ('projects', 'contact_name'),
           ('projects', 'contact_email'),
           ('projects', 'contact_phone'),
           ('project_equipment', 'lease_expense'),
           ('project_equipment', 'lease_expense_date'),
           ('tax_deadline_occurrences', 'occurrence_key'),
           ('tax_deadline_occurrences', 'code'),
           ('tax_deadline_occurrences', 'title'),
           ('tax_deadline_occurrences', 'description'),
           ('tax_deadline_occurrences', 'category'),
           ('tax_deadline_occurrences', 'source_url'),
           ('tax_deadline_occurrences', 'source_version'),
           ('documents', 'month')
         )
       ORDER BY table_name, column_name`,
    );
    const currentIndexes: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)`,
      [[...indexes, 'IDX_2316d4640156bba9d2a2986313']],
    );
    const currentChecks: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)`,
      [checks],
    );
    const currentForeignKeys: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)`,
      [foreignKeys.map(([name]) => name)],
    );

    expect(tables).toHaveLength(0);
    expect(restoredColumns).toHaveLength(15);
    expect(currentIndexes.map((row) => row.name)).toEqual(['IDX_2316d4640156bba9d2a2986313']);
    expect(currentChecks).toHaveLength(0);
    expect(currentForeignKeys).toHaveLength(0);

    await dataSource.runMigrations({ transaction: 'each' });
  });
});

function createDataSource(testDatabaseUrl: string, schema: string): DataSource {
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
