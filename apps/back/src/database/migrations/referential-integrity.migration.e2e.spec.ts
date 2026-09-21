import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, MigrationInterface } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from './1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from './1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from './1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from './1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from './1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from './1730000005000-AddReferentialIntegrity';

const migrations: Array<new () => MigrationInterface> = [
  InitialLedgerlySchema1730000000000,
  AddListQueryIndexes1730000001000,
  AddEncryptedStoredFileEnvelopes1730000002000,
  ReconcileEntitySchemaDrift1730000003000,
  AddMissingUniqueConstraints1730000004000,
  AddReferentialIntegrity1730000005000,
];

const foreignKeys = [
  ['FK_documents_project', 'r'],
  ['FK_documents_supplier', 'r'],
  ['FK_documents_staff_member', 'r'],
  ['FK_staff_documents_staff_member', 'c'],
  ['FK_staff_documents_type', 'r'],
  ['FK_company_documents_type', 'r'],
  ['FK_project_equipment_project', 'c'],
  ['FK_project_equipment_equipment', 'c'],
  ['FK_schedule_events_project', 'c'],
  ['FK_schedule_event_days_event', 'c'],
  ['FK_schedule_event_equipment_event', 'c'],
  ['FK_schedule_event_equipment_equipment', 'c'],
  ['FK_schedule_event_staff_event', 'c'],
  ['FK_schedule_event_staff_staff_member', 'c'],
  ['FK_tax_client_profiles_project', 'c'],
  ['FK_tax_deadline_occurrences_project', 'c'],
  ['FK_notifications_resource_project', 'c'],
] as const;

const indexes = [
  'IDX_551c4a916936c52d0dc7966055',
  'IDX_bd2cb5e5922618cb98dd2ee706',
  'IDX_908cca007dc1601ba360b27982',
  'IDX_9c0f0154f25052628f0901ee95',
  'IDX_3edf08887d417f800640857a79',
  'IDX_961dfb433dc74b91e0bff066a6',
  'IDX_14e80958c8e830968a46a8370c',
  'IDX_2a2b9eedbeb10846af93f44398',
  'IDX_4a9fc8bfdc30c3f4b88dc489e8',
  'IDX_ae52fd562e234be33006f1f3bb',
] as const;

const addedColumns = [
  ['documents', 'created_at'],
  ['documents', 'updated_at'],
  ['documents', 'deleted_at'],
  ['documents', 'created_by'],
  ['documents', 'deleted_by'],
  ['suppliers', 'archived_at'],
  ['equipment', 'archived_at'],
  ['staff_members', 'archived_at'],
] as const;

describe('AddReferentialIntegrity1730000005000', () => {
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

  it('creates every approved foreign key with the expected delete action', async () => {
    const rows: Array<{ name: string; deleteAction: string }> = await dataSource.query(
      `SELECT c.conname AS name, c.confdeltype AS "deleteAction"
       FROM pg_constraint c
       WHERE c.connamespace = current_schema()::regnamespace
         AND c.conname = ANY($1)
       ORDER BY c.conname`,
      [foreignKeys.map(([name]) => name)],
    );

    expect(rows).toEqual(
      foreignKeys
        .map(([name, deleteAction]) => ({ name, deleteAction }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  });

  it('creates every approved foreign-key index and archive column', async () => {
    const indexRows: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)
       ORDER BY indexname`,
      [indexes],
    );
    const columnRows: Array<{ tableName: string; columnName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND (table_name, column_name) IN (('documents', 'created_at'), ('documents', 'updated_at'), ('documents', 'deleted_at'), ('documents', 'created_by'), ('documents', 'deleted_by'), ('suppliers', 'archived_at'), ('equipment', 'archived_at'), ('staff_members', 'archived_at'))
       ORDER BY table_name, column_name`,
    );

    expect(indexRows.map((row) => row.name)).toEqual([...indexes].sort());
    expect(columnRows).toHaveLength(addedColumns.length);
  });

  it('cascades schedule event composition rows when the event is deleted', async () => {
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type) VALUES ('00000000-0000-0000-0000-000000000201', 'Project', 'PROJECT-201', 'client')`,
    );
    await dataSource.query(
      `INSERT INTO staff_members (id, first_name, last_name) VALUES ('00000000-0000-0000-0000-000000000202', 'Ada', 'Lovelace')`,
    );
    await dataSource.query(
      `INSERT INTO equipment (id, name, stock) VALUES ('00000000-0000-0000-0000-000000000203', 'Camera', 1)`,
    );
    await dataSource.query(
      `INSERT INTO schedule_events (id, project_id, title) VALUES ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000201', 'Shoot')`,
    );
    await dataSource.query(
      `INSERT INTO schedule_event_days (id, event_id, date) VALUES ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000204', '2026-09-21')`,
    );
    await dataSource.query(
      `INSERT INTO schedule_event_staff (event_id, staff_member_id) VALUES ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000202')`,
    );
    await dataSource.query(
      `INSERT INTO schedule_event_equipment (event_id, equipment_id, quantity) VALUES ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000203', 1)`,
    );

    await dataSource.query(
      `DELETE FROM schedule_events WHERE id = '00000000-0000-0000-0000-000000000204'`,
    );

    const rows: Array<{ days: string; staff: string; equipment: string }> = await dataSource.query(
      `SELECT
         (SELECT count(*) FROM schedule_event_days WHERE event_id = '00000000-0000-0000-0000-000000000204') AS days,
         (SELECT count(*) FROM schedule_event_staff WHERE event_id = '00000000-0000-0000-0000-000000000204') AS staff,
         (SELECT count(*) FROM schedule_event_equipment WHERE event_id = '00000000-0000-0000-0000-000000000204') AS equipment`,
    );

    expect(rows[0]).toEqual({ days: '0', staff: '0', equipment: '0' });
  });

  it('removes and reapplies every object created by U2', async () => {
    await dataSource.undoLastMigration({ transaction: 'each' });

    const foreignKeyRows: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)`,
      [foreignKeys.map(([name]) => name)],
    );
    const indexRows: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)`,
      [indexes],
    );
    const columnRows: Array<{ tableName: string; columnName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND (table_name, column_name) IN (('documents', 'created_at'), ('documents', 'updated_at'), ('documents', 'deleted_at'), ('documents', 'created_by'), ('documents', 'deleted_by'), ('suppliers', 'archived_at'), ('equipment', 'archived_at'), ('staff_members', 'archived_at'))`,
    );

    expect(foreignKeyRows).toHaveLength(0);
    expect(indexRows).toHaveLength(0);
    expect(columnRows).toHaveLength(0);

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
