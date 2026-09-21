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

const baseMigrations: Array<new () => MigrationInterface> = [
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
];

const projectId = '00000000-0000-0000-0000-000000001101';
const clientId = '00000000-0000-0000-0000-000000001102';

describe('RequireProjectClient1730000011000', () => {
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
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency, client_id)
       VALUES ($1, 'Legacy project', 'LEGACY-PARENT', 'internal', 'EUR', NULL)`,
      [projectId],
    );
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

  it('fails safely on null parents, then applies and reverts after deterministic repair', async () => {
    const failure = await invokeMigration('up').catch((error: unknown) => error);
    expect(failure).toMatchObject({
      message:
        'Cannot enforce mandatory project client ownership: projects.client_id contains NULL values; assign every project an active client or reset and reseed the local database before retrying',
    });
    expect(String((failure as Error).message)).not.toContain(projectId);

    await dataSource.query(
      `INSERT INTO clients (id, name, tax_id) VALUES ($1, 'Active client', 'B99112233')`,
      [clientId],
    );
    await dataSource.query('UPDATE projects SET client_id = $1 WHERE id = $2', [clientId, projectId]);

    await expect(invokeMigration('up')).resolves.toBeUndefined();
    await expect(dataSource.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'client_id'`,
    )).resolves.toEqual([{ is_nullable: 'NO' }]);
    await expect(dataSource.query(
      `SELECT indexname AS name FROM pg_indexes
       WHERE schemaname = current_schema() AND indexname = 'IDX_projects_client_id'`,
    )).resolves.toEqual([{ name: 'IDX_projects_client_id' }]);
    await expect(dataSource.query(
      `SELECT conname AS name, confdeltype AS "deleteAction"
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = 'FK_projects_client'`,
    )).resolves.toEqual([{ name: 'FK_projects_client', deleteAction: 'r' }]);

    await expect(invokeMigration('down')).resolves.toBeUndefined();
    await expect(dataSource.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'client_id'`,
    )).resolves.toEqual([{ is_nullable: 'YES' }]);
    await expect(dataSource.query(
      `SELECT indexname AS name FROM pg_indexes
       WHERE schemaname = current_schema() AND indexname = 'IDX_projects_client_id'`,
    )).resolves.toEqual([{ name: 'IDX_projects_client_id' }]);
    await expect(dataSource.query(
      `SELECT conname AS name, confdeltype AS "deleteAction"
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = 'FK_projects_client'`,
    )).resolves.toEqual([{ name: 'FK_projects_client', deleteAction: 'r' }]);
    await expect(dataSource.query('SELECT client_id FROM projects WHERE id = $1', [projectId]))
      .resolves.toEqual([{ client_id: clientId }]);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new RequireProjectClient1730000011000();
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
