import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AddPlanningPermission1730000015000 } from './1730000015000-AddPlanningPermission';

describe('AddPlanningPermission1730000015000', () => {
  let dataSource: DataSource;
  let schema: string;
  let databaseUrl: string;

  beforeEach(async () => {
    databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;

    const administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      logging: false,
      extra: { max: 1, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.query('CREATE TABLE workspace_members (id uuid PRIMARY KEY, permissions jsonb NOT NULL)');
    await dataSource.query(
      'INSERT INTO workspace_members (id, permissions) VALUES ($1, $2::jsonb)',
      [randomUUID(), JSON.stringify({ projects: 'edit', documents: 'view' })],
    );
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();

    if (schema && databaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: databaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('backfills planning to none and rollback removes only that permission', async () => {
    await invokeMigration('up');

    const migrated: Array<{ permissions: Record<string, string> }> = await dataSource.query(
      'SELECT permissions FROM workspace_members',
    );
    expect(migrated).toEqual([
      { permissions: { projects: 'edit', documents: 'view', planning: 'none' } },
    ]);

    await invokeMigration('down');

    const reverted: Array<{ permissions: Record<string, string> }> = await dataSource.query(
      'SELECT permissions FROM workspace_members',
    );
    expect(reverted).toEqual([{ permissions: { projects: 'edit', documents: 'view' } }]);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new AddPlanningPermission1730000015000();
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
