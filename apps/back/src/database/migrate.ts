import 'reflect-metadata';
import 'dotenv/config';
import { getMigrations } from 'better-auth/db/migration';
import dataSource from './data-source';
import { auth, authDatabase } from '../lib/auth';

export const INITIAL_MIGRATION_TIMESTAMP = 1730000000000;
export const INITIAL_MIGRATION_NAME = 'InitialLedgerlySchema1730000000000';

export type MigrationMode = 'fresh' | 'auto' | 'verify' | 'baseline-existing';

type QueryRow = Record<string, unknown>;

const APPLICATION_TABLES = [
  'companies',
  'workspace_members',
  'security_audit_logs',
  'suppliers',
  'staff_members',
  'staff_document_types',
  'company_document_types',
  'equipment',
  'equipment_documents',
  'projects',
  'documents',
  'project_equipment',
  'staff_documents',
  'company_documents',
  'schedule_events',
  'schedule_event_days',
  'schedule_event_equipment',
  'schedule_event_staff',
  'invoice_extraction_hints',
  'extraction_outcomes',
  'notifications',
  'notification_event_retries',
  'tax_client_profiles',
  'tax_compliance_settings',
  'tax_deadline_occurrences',
  'tax_source_states',
];

function parseMode(argv: string[]): MigrationMode {
  const value = argv.find((argument) => argument.startsWith('--mode='))?.slice('--mode='.length);
  if (value === 'fresh' || value === 'auto' || value === 'verify' || value === 'baseline-existing') {
    return value;
  }

  throw new Error('Migration mode must be one of: fresh, auto, verify, baseline-existing');
}

async function applicationTableCount(): Promise<number> {
  const result = (await dataSource.query(
    `SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1)`,
    [APPLICATION_TABLES],
  )) as unknown as Array<{ count: number | string }>;

  return Number(result[0]?.count ?? 0);
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = (await dataSource.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`,
    [tableName],
  )) as unknown as QueryRow[];

  return result.length > 0;
}

async function hasMigrationMarker(): Promise<boolean> {
  if (!(await tableExists('migrations'))) return false;

  const marker = (await dataSource.query(
    `SELECT 1 FROM "migrations" WHERE "timestamp" = $1 AND "name" = $2 LIMIT 1`,
    [INITIAL_MIGRATION_TIMESTAMP, INITIAL_MIGRATION_NAME],
  )) as unknown as QueryRow[];

  return marker.length > 0;
}

async function hasBetterAuthTables(): Promise<boolean> {
  const result = (await dataSource.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name = ANY($1)
     LIMIT 1`,
    [['user', 'session', 'account', 'verification']],
  )) as unknown as QueryRow[];

  return result.length > 0;
}

async function assertSchemaHasNoDiff(): Promise<void> {
  const schemaBuilder = dataSource.driver.createSchemaBuilder();
  const schemaLog = await schemaBuilder.log();
  if (schemaLog.upQueries.length > 0 || schemaLog.downQueries.length > 0) {
    throw new Error(
      `Database schema differs from the entity model: ${schemaLog.upQueries.length} up queries and ${schemaLog.downQueries.length} down queries`,
    );
  }
}

async function assertBetterAuthIsCurrent(): Promise<void> {
  const migrations = await getMigrations(auth.options);
  if (migrations.toBeCreated.length > 0 || migrations.toBeAdded.length > 0) {
    throw new Error(
      `Better Auth schema is incomplete: ${migrations.toBeCreated.length} tables and ${migrations.toBeAdded.length} columns pending`,
    );
  }
}

async function runBetterAuthMigrations(): Promise<void> {
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
}

async function runFresh(): Promise<void> {
  if (
    (await applicationTableCount()) > 0 ||
    (await tableExists('migrations')) ||
    (await hasBetterAuthTables())
  ) {
    throw new Error('Fresh migrations refuse to run against an existing Ledgerly database');
  }

  await dataSource.runMigrations({ transaction: 'each' });
  await runBetterAuthMigrations();
}

async function runAuto(): Promise<void> {
  const tableCount = await applicationTableCount();
  const markerPresent = await hasMigrationMarker();
  if (tableCount === 0 && !markerPresent) {
    await runFresh();
    return;
  }
  if (!markerPresent) {
    throw new Error('Existing Ledgerly tables are not baselined; run baseline-existing after a verified rehearsal');
  }

  await dataSource.runMigrations({ transaction: 'each' });
  await runBetterAuthMigrations();
}

async function runVerify(): Promise<void> {
  if (!(await hasMigrationMarker())) {
    throw new Error('Database has no Ledgerly migration marker');
  }

  const pending = await dataSource.showMigrations();
  if (pending) {
    throw new Error('TypeORM migrations are pending');
  }

  await assertSchemaHasNoDiff();
  await assertBetterAuthIsCurrent();
}

async function runBaselineExisting(): Promise<void> {
  if (process.env.LEDGERLY_EXISTING_DB_CUTOVER !== '1') {
    throw new Error('Existing database cutover requires LEDGERLY_EXISTING_DB_CUTOVER=1');
  }
  if ((await applicationTableCount()) !== APPLICATION_TABLES.length) {
    throw new Error('Existing database baseline requires every Ledgerly application table');
  }
  if (await hasMigrationMarker()) {
    await runAuto();
    return;
  }

  await assertSchemaHasNoDiff();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const metadataTable = (await runner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'migrations'`,
    )) as unknown as QueryRow[];
    if (metadataTable.length === 0) {
      await runner.query(
        `CREATE TABLE "migrations" ("id" SERIAL NOT NULL, "timestamp" bigint NOT NULL, "name" varchar NOT NULL, CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id"))`,
      );
    }

    const columns = (await runner.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'migrations' ORDER BY ordinal_position`,
    )) as unknown as Array<{ column_name: string; data_type: string }>;
    const expected = [
      ['id', 'integer'],
      ['timestamp', 'bigint'],
      ['name', 'character varying'],
    ];
    if (
      columns.length !== expected.length ||
      columns.some(
        (column, index) =>
          column.column_name !== expected[index][0] || column.data_type !== expected[index][1],
      )
    ) {
      throw new Error('The TypeORM migrations metadata table has an incompatible schema');
    }

    const primaryKey = (await runner.query(
      `SELECT constraint_name FROM information_schema.table_constraints
       WHERE table_schema = current_schema() AND table_name = 'migrations'
         AND constraint_type = 'PRIMARY KEY'`,
    )) as unknown as Array<{ constraint_name: string }>;
    if (primaryKey.length !== 1 || primaryKey[0].constraint_name !== 'PK_8c82d7f526340ab734260ea46be') {
      throw new Error('The TypeORM migrations metadata table has an incompatible primary key');
    }

    await runner.query(`SELECT id FROM "migrations" ORDER BY id FOR UPDATE`);
    const rows = (await runner.query(`SELECT "timestamp", "name" FROM "migrations" ORDER BY "id"`)) as unknown as QueryRow[];
    if (rows.length > 0) {
      throw new Error('The TypeORM migrations metadata table contains unexpected history');
    }

    await runner.query(
      `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
      [INITIAL_MIGRATION_TIMESTAMP, INITIAL_MIGRATION_NAME],
    );
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }

  await assertBetterAuthIsCurrent();
}

export async function runDatabaseMigrations(mode: MigrationMode): Promise<void> {
  try {
    await dataSource.initialize();
    if (mode === 'fresh') await runFresh();
    if (mode === 'auto') await runAuto();
    if (mode === 'verify') await runVerify();
    if (mode === 'baseline-existing') await runBaselineExisting();
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
    await authDatabase.destroy();
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const mode = parseMode(argv);
  await runDatabaseMigrations(mode);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
