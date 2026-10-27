import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const mode = process.argv[2];
const databaseUrl = parseDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
const schema = parseSchema(process.env.LEDGERLY_MIGRATION_TEST_SCHEMA);
const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  options: `-c search_path=${schema},public`,
});
const database = new Kysely({ dialect: new PostgresDialect({ pool }) });
const authOptions = {
  appName: 'Ledgerly migration test',
  baseURL: 'http://localhost:3005',
  database: { db: database, type: 'postgres' },
  emailAndPassword: { enabled: false },
  logger: { level: 'error', log: () => {} },
  secret: 'ledgerly-migration-test-secret-value-32',
  socialProviders: {
    google: { clientId: 'synthetic-google-client', clientSecret: 'synthetic-google-secret' },
  },
  trustedOrigins: ['http://localhost:5173'],
  advanced: { database: { validateSchema: true } },
};

try {
  if (mode === 'prepare') await prepareLegacySchema();
  else if (mode === 'verify') await verifyCurrentSchema();
  else throw new Error('Migration regression mode must be prepare or verify');
} finally {
  await database.destroy();
}

async function prepareLegacySchema() {
  const migrations = await getMigrations(authOptions);
  await migrations.runMigrations();
  await pool.query('ALTER TABLE "account" ADD COLUMN "issuer" text');
  await pool.query('UPDATE "account" SET "issuer" = $1', ['https://accounts.google.com']);
  await pool.query('ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL');
  await pool.query(
    'CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId")',
  );

  const userId = randomUUID();
  await pool.query(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, 'Migration User', $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [userId, `${userId}@ledgerly.test`],
  );
  await pool.query(
    `INSERT INTO "account" ("id", "accountId", "providerId", "userId", "issuer", "createdAt", "updatedAt")
     VALUES ($1, 'google-user-legacy', 'google', $2, 'https://accounts.google.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [randomUUID(), userId],
  );

  const legacyAuth = betterAuth(authOptions);
  const legacyContext = await legacyAuth.$context;
  assert.ok(legacyContext.checkSchema);
  await assert.rejects(legacyContext.checkSchema(), /account\.issuer/);

  const legacySchema = await getMigrations(authOptions, { throwOnUnsafe: false });
  assert.match(
    legacySchema.schemaProblems.join('\n'),
    /Column "issuer" on table "account" is required/,
  );
}

async function verifyCurrentSchema() {
  const currentSchema = await getMigrations(authOptions, { throwOnUnsafe: false });
  assert.deepEqual(currentSchema.schemaProblems, []);

  const currentAuth = betterAuth(authOptions);
  const currentContext = await currentAuth.$context;
  assert.ok(currentContext.checkSchema);
  await currentContext.checkSchema();

  const response = await currentAuth.handler(
    new Request('http://localhost:3005/api/auth/sign-in/social', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: 'http://localhost:5173/auth/callback',
      }),
    }),
  );
  const responseBody = await response.json();

  assert.equal(response.status, 200);
  assert.equal(new URL(responseBody.url).origin, 'https://accounts.google.com');
  assert.equal(
    new URL(responseBody.url).searchParams.get('redirect_uri'),
    'http://localhost:3005/api/auth/callback/google',
  );
}

function parseDatabaseUrl(value) {
  if (typeof value !== 'string') throw new Error('Invalid migration test database URL');
  const url = new URL(value);
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

function parseSchema(value) {
  if (typeof value !== 'string' || !/^ledgerly_migration_[a-f0-9]{32}$/.test(value)) {
    throw new Error('Invalid migration test schema');
  }
  return value;
}
