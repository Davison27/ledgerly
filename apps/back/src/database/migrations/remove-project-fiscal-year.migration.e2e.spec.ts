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
];

const projectId = '00000000-0000-0000-0000-000000001001';
const profileId = '00000000-0000-0000-0000-000000001002';

describe('RemoveProjectFiscalYear1730000010000', () => {
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

  it('removes and restores the nullable project fiscal-year column while retaining tax calendar settings', async () => {
    await expect(dataSource.query(
      'SELECT fiscal_year AS "fiscalYear" FROM projects WHERE id = $1',
      [projectId],
    )).resolves.toEqual([{ fiscalYear: '2024' }]);
    await expect(dataSource.query(
      'SELECT fiscal_year_start_month AS "fiscalYearStartMonth" FROM tax_client_profiles WHERE id = $1',
      [profileId],
    )).resolves.toEqual([{ fiscalYearStartMonth: 7 }]);

    await invokeMigration('up');

    await expect(dataSource.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'fiscal_year'`,
    )).resolves.toHaveLength(0);
    await expect(dataSource.query(
      'SELECT fiscal_year_start_month AS "fiscalYearStartMonth" FROM tax_client_profiles WHERE id = $1',
      [profileId],
    )).resolves.toEqual([{ fiscalYearStartMonth: 7 }]);

    await invokeMigration('down');

    await expect(dataSource.query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'fiscal_year'`,
    )).resolves.toEqual([{ column_name: 'fiscal_year', is_nullable: 'YES' }]);
    await expect(dataSource.query(
      'SELECT fiscal_year FROM projects WHERE id = $1',
      [projectId],
    )).resolves.toEqual([{ fiscal_year: null }]);

    await invokeMigration('up');
    await expect(dataSource.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'fiscal_year'`,
    )).resolves.toHaveLength(0);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new RemoveProjectFiscalYear1730000010000();
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
    `INSERT INTO projects (id, name, code, type, fiscal_year, currency)
     VALUES ($1, 'Fiscal year project', 'FISCAL-YEAR', 'client', '2024', 'EUR')`,
    [projectId],
  );
  await dataSource.query(
    `INSERT INTO tax_client_profiles (id, project_id, country_code, entity_type, fiscal_year_start_month, obligation_keys)
     VALUES ($1, $2, 'ES', 'company', 7, '[]'::jsonb)`,
    [profileId, projectId],
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
