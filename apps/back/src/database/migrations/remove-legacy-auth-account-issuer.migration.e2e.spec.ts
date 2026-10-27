import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { RemoveLegacyAuthAccountIssuer1730000017000 } from './1730000017000-RemoveLegacyAuthAccountIssuer';

describe('RemoveLegacyAuthAccountIssuer1730000017000', () => {
  let dataSource: DataSource;
  let databaseUrl: string;
  let schema: string;

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

  it('does nothing before Better Auth creates the account table', async () => {
    await invokeMigration('up');

    const tables: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'account'`,
    );

    expect(tables).toEqual([]);
  });

  it('does nothing when the account table has no legacy issuer column', async () => {
    await dataSource.query(
      'CREATE TABLE "account" ("id" text PRIMARY KEY, "providerId" text NOT NULL, "accountId" text NOT NULL)',
    );

    await invokeMigration('up');

    const columns = await accountColumns();
    const indexes = await accountIndexes();
    expect(columns).toEqual(['accountId', 'id', 'providerId']);
    expect(indexes).toEqual(['account_pkey']);
  });

  it('preserves account rows, removes issuer, and enforces provider identity uniqueness', async () => {
    await createLegacyAccountTable();
    const accountId = randomUUID();
    await insertAccount(accountId, 'google', 'google-user-1', 'https://accounts.google.com');

    await invokeMigration('up');

    const accounts: Array<{ id: string; accountId: string; providerId: string; userId: string }> =
      await dataSource.query(
        `SELECT id, "accountId" AS "accountId", "providerId" AS "providerId", "userId" AS "userId"
         FROM "account"`,
      );
    expect(accounts).toEqual([
      { id: accountId, accountId: 'google-user-1', providerId: 'google', userId: 'user-1' },
    ]);
    expect(await accountColumns()).not.toContain('issuer');
    expect(await accountIndexes()).toContain('account_providerId_accountId_uidx');

    await expect(
      insertAccountWithoutIssuer(randomUUID(), 'google', 'google-user-1'),
    ).rejects.toMatchObject({
      driverError: { code: '23505', constraint: 'account_providerId_accountId_uidx' },
    });

    await insertAccountWithoutIssuer(randomUUID(), 'github', 'google-user-1');
    await invokeMigration('up');
    expect(await accountColumns()).not.toContain('issuer');
    expect(await accountIndexes()).toContain('account_providerId_accountId_uidx');
  });

  it('refuses duplicate provider identities without changing rows or schema', async () => {
    await createLegacyAccountTable();
    await insertAccount(randomUUID(), 'google', 'same-account', 'https://accounts.google.com');
    await insertAccount(randomUUID(), 'google', 'same-account', 'https://accounts.example.test');

    await expect(invokeMigration('up')).rejects.toThrow(
      'Cannot remove account.issuer while duplicate (providerId, accountId) identities exist',
    );

    expect(await accountColumns()).toContain('issuer');
    expect(await accountIndexes()).not.toContain('account_providerId_accountId_uidx');
    const count: Array<{ count: number | string }> = await dataSource.query(
      'SELECT count(*)::int AS count FROM "account"',
    );
    expect(Number(count[0]?.count)).toBe(2);
  });

  it('refuses an existing identity index name with the wrong definition', async () => {
    await createLegacyAccountTable();
    await insertAccount(randomUUID(), 'google', 'google-user-1', 'https://accounts.google.com');
    await dataSource.query(
      'CREATE UNIQUE INDEX "account_providerId_accountId_uidx" ON "account" ("userId")',
    );

    await expect(invokeMigration('up')).rejects.toThrow(
      'Index account_providerId_accountId_uidx exists with an incompatible definition',
    );

    expect(await accountColumns()).toContain('issuer');
    expect(await accountIndexes()).toContain('account_providerId_accountId_uidx');
    const rows: Array<{ count: number | string }> = await dataSource.query(
      'SELECT count(*)::int AS count FROM "account"',
    );
    expect(Number(rows[0]?.count)).toBe(1);
  });

  it('re-adds issuer as nullable on rollback without removing account rows or identity uniqueness', async () => {
    await createLegacyAccountTable();
    const accountId = randomUUID();
    await insertAccount(accountId, 'google', 'google-user-1', 'https://accounts.google.com');
    await invokeMigration('up');

    await invokeMigration('down');

    const issuer: Array<{ isNullable: string }> = await dataSource.query(
      `SELECT is_nullable AS "isNullable" FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'account' AND column_name = 'issuer'`,
    );
    const accounts: Array<{ id: string; accountId: string; providerId: string }> =
      await dataSource.query(
        `SELECT id, "accountId" AS "accountId", "providerId" AS "providerId" FROM "account"`,
      );

    expect(issuer).toEqual([{ isNullable: 'YES' }]);
    expect(accounts).toEqual([{ id: accountId, accountId: 'google-user-1', providerId: 'google' }]);
    expect(await accountIndexes()).toContain('account_providerId_accountId_uidx');
  });

  it('validates a legacy schema and serves the Google sign-in redirect after migration', async () => {
    runBetterAuthRegression('prepare');
    await invokeMigration('up');
    runBetterAuthRegression('verify');
  });

  async function createLegacyAccountTable(): Promise<void> {
    await dataSource.query(`
      CREATE TABLE "account" (
        "id" text PRIMARY KEY,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" text NOT NULL,
        "issuer" text NOT NULL
      )
    `);
    await dataSource.query(
      'CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId")',
    );
    await dataSource.query('CREATE INDEX "account_userId_idx" ON "account" ("userId")');
  }

  async function insertAccount(
    id: string,
    providerId: string,
    accountId: string,
    issuer: string,
  ): Promise<void> {
    await dataSource.query(
      'INSERT INTO "account" ("id", "accountId", "providerId", "userId", "issuer") VALUES ($1, $2, $3, $4, $5)',
      [id, accountId, providerId, 'user-1', issuer],
    );
  }

  async function insertAccountWithoutIssuer(
    id: string,
    providerId: string,
    accountId: string,
  ): Promise<void> {
    await dataSource.query(
      'INSERT INTO "account" ("id", "accountId", "providerId", "userId") VALUES ($1, $2, $3, $4)',
      [id, accountId, providerId, 'user-1'],
    );
  }

  async function accountColumns(): Promise<string[]> {
    const rows: Array<{ columnName: string }> = await dataSource.query(
      `SELECT column_name AS "columnName" FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'account' ORDER BY column_name`,
    );
    return rows.map((row) => row.columnName);
  }

  async function accountIndexes(): Promise<string[]> {
    const rows: Array<{ indexName: string }> = await dataSource.query(
      `SELECT indexname AS "indexName" FROM pg_indexes
       WHERE schemaname = current_schema() AND tablename = 'account' ORDER BY indexname`,
    );
    return rows.map((row) => row.indexName);
  }

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new RemoveLegacyAuthAccountIssuer1730000017000();
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

  function runBetterAuthRegression(mode: 'prepare' | 'verify'): void {
    execFileSync(
      process.execPath,
      [join(__dirname, '..', '..', '..', 'test', 'better-auth-legacy-issuer-regression.mjs'), mode],
      {
        env: {
          ...process.env,
          LEDGERLY_MIGRATION_TEST_URL: databaseUrl,
          LEDGERLY_MIGRATION_TEST_SCHEMA: schema,
        },
        stdio: 'inherit',
        timeout: 15_000,
      },
    );
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
