import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const mode = process.argv[2];
const runtimeRequire = createRequire('/app/dist/lib/auth.js');
const { auth, authDatabase } = runtimeRequire('/app/dist/lib/auth.js');
const { Pool } = runtimeRequire('pg');
const { makeSignature } = await import(runtimeRequire.resolve('better-auth/crypto'));
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
  query_timeout: 15000,
});

const MIGRATION_TIMESTAMP = 1730000017000;
const MIGRATION_NAME = 'RemoveLegacyAuthAccountIssuer1730000017000';
const USER_ID = 'legacy-upgrade-user';
const MEMBER_ID = '55555555-5555-4555-8555-555555555555';
const ACCOUNT_ID = 'legacy-upgrade-account';
const SESSION_TOKEN = 'ledgerly-upgrade-rehearsal-session-token';
const EMAIL = 'upgrade-rehearsal@example.com';
const USER_NAME = 'Ledgerly Upgrade Rehearsal';
const ACCOUNT_PROVIDER_ID = 'google';
const PROVIDER_ACCOUNT_ID = 'legacy-google-account-123';

try {
  assertSyntheticProductionEnvironment();

  let snapshot;
  if (mode === 'assert-fresh') await assertFreshDatabase();
  else if (mode === 'prepare-current') snapshot = await prepareCurrentDatabase();
  else if (mode === 'assert-current') await assertCurrentDatabase(process.argv[3]);
  else if (mode === 'prepare-legacy') snapshot = await prepareLegacyDatabase();
  else if (mode === 'assert-upgraded') await assertUpgradedDatabase(process.argv[3]);
  else if (mode === 'auth-smoke') await assertAuthenticatedController(process.argv[3]);
  else throw new Error('Production upgrade fixture mode is invalid.');

  process.stdout.write(
    'LEDGERLY_PRODUCTION_UPGRADE_FIXTURE:' + JSON.stringify({ mode, snapshot }) + '\n',
  );
} finally {
  await pool.end();
  await authDatabase.destroy();
}

function assertSyntheticProductionEnvironment() {
  assert.equal(process.version, 'v22.23.4');
  assert.equal(process.env.NODE_ENV, 'production');
  assert.equal(process.env.DB_HOST, 'postgres');
  assert.match(process.env.DB_NAME ?? '', /^ledgerly_e2e_[a-f0-9]{12}$/);
  assert.match(process.env.DB_USER ?? '', /^e2e_[a-f0-9]+$/);
  assert.match(process.env.FRONTEND_URL ?? '', /^https:\/\/localhost:\d+$/);
  assert.equal(process.env.BACKEND_PUBLIC_URL, process.env.FRONTEND_URL);
  assert.equal(process.env.COOKIE_SECURE, 'true');
  assert.equal(process.env.TRUST_PROXY, 'true');
  assert.ok((process.env.BETTER_AUTH_SECRET ?? '').length >= 32);
}

async function assertFreshDatabase() {
  await assertIssuerColumn(false);
  const counts = await pool.query(
    'SELECT (SELECT count(*) FROM "user")::integer AS users, (SELECT count(*) FROM account)::integer AS accounts, (SELECT count(*) FROM session)::integer AS sessions, (SELECT count(*) FROM workspace_members)::integer AS members',
  );
  assert.deepEqual(counts.rows[0], { users: 0, accounts: 0, sessions: 0, members: 0 });
}

async function prepareCurrentDatabase() {
  await assertFreshDatabase();
  await createPersistedFixture();
  await assertPersistedRows();
  return Buffer.from(JSON.stringify(await readPersistedState()), 'utf8').toString('base64');
}

async function prepareLegacyDatabase() {
  await assertFreshDatabase();
  await assertLatestMigrationMarker();
  await createPersistedFixture();

  await pool.query('DROP INDEX IF EXISTS "account_providerId_accountId_uidx"');
  await pool.query('ALTER TABLE account ADD COLUMN issuer text');
  await pool.query('UPDATE account SET issuer = $1 WHERE id = $2', [
    'https://accounts.google.com',
    ACCOUNT_ID,
  ]);
  await pool.query('ALTER TABLE account ALTER COLUMN issuer SET NOT NULL');
  await pool.query(
    'CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON account (issuer, "accountId")',
  );

  const oldIndex = await pool.query(
    'SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1 AND indexname = $2',
    ['account', 'account_issuer_accountId_uidx'],
  );
  assert.equal(oldIndex.rowCount, 1);
  assert.match(oldIndex.rows[0].indexdef, /UNIQUE INDEX/);
  assert.match(oldIndex.rows[0].indexdef, /\(issuer, "accountId"\)$/);

  const deletion = await pool.query('DELETE FROM migrations WHERE timestamp = $1 AND name = $2', [
    MIGRATION_TIMESTAMP,
    MIGRATION_NAME,
  ]);
  assert.equal(deletion.rowCount, 1);
  await assertLegacyIssuer();
  await assertMigrationMarkerAbsent();
  await assertPersistedRows();
  return Buffer.from(JSON.stringify(await readPersistedState()), 'utf8').toString('base64');
}

async function createPersistedFixture() {
  const now = new Date();
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      id: USER_ID,
      name: USER_NAME,
      email: EMAIL,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    { method: 'test' },
  );
  assert.equal(user.id, USER_ID);
  const account = await context.internalAdapter.createAccount({
    id: ACCOUNT_ID,
    accountId: PROVIDER_ACCOUNT_ID,
    providerId: ACCOUNT_PROVIDER_ID,
    userId: USER_ID,
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(account.id, ACCOUNT_ID);
  await pool.query(
    'INSERT INTO workspace_members (id, email, name, role, permissions, status, is_founder, invited_at, joined_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, false, $7, $7)',
    [MEMBER_ID, EMAIL, USER_NAME, 'member', JSON.stringify(permissions()), 'active', now],
  );

  assert.equal(typeof context.checkSchema, 'function');
  const session = await context.internalAdapter.createSession(
    USER_ID,
    false,
    {
      token: SESSION_TOKEN,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    },
    true,
  );
  assert.equal(session.token, SESSION_TOKEN);
  assert.equal(session.userId, USER_ID);
  await context.checkSchema();
}

async function assertLatestMigrationMarker() {
  const result = await pool.query(
    'SELECT timestamp::text AS timestamp, name FROM migrations ORDER BY timestamp DESC LIMIT 1',
  );
  assert.deepEqual(result.rows[0], {
    timestamp: String(MIGRATION_TIMESTAMP),
    name: MIGRATION_NAME,
  });
}

async function assertMigrationMarkerAbsent() {
  const result = await pool.query(
    'SELECT count(*)::integer AS count FROM migrations WHERE timestamp = $1 AND name = $2',
    [MIGRATION_TIMESTAMP, MIGRATION_NAME],
  );
  assert.equal(result.rows[0].count, 0);
  const initial = await pool.query(
    'SELECT count(*)::integer AS count FROM migrations WHERE timestamp = $1 AND name = $2',
    ['1730000000000', 'InitialLedgerlySchema1730000000000'],
  );
  assert.equal(initial.rows[0].count, 1);
}

async function assertCurrentDatabase(encodedSnapshot) {
  await assertIssuerColumn(false);
  await assertMigrationMarkerPresent();
  await assertPersistedRows();
  assert.deepEqual(
    JSON.parse(JSON.stringify(await readPersistedState())),
    decodeSnapshot(encodedSnapshot),
  );
}

async function assertUpgradedDatabase(encodedSnapshot) {
  await assertIssuerColumn(false);
  await assertMigrationMarkerPresent();
  await assertPersistedRows();
  assert.deepEqual(
    JSON.parse(JSON.stringify(await readPersistedState())),
    decodeSnapshot(encodedSnapshot),
  );

  const indexes = await pool.query(
    'SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1',
    ['account'],
  );
  const legacyIndex = indexes.rows.find(
    (index) => index.indexname === 'account_issuer_accountId_uidx',
  );
  const identityIndex = indexes.rows.find(
    (index) => index.indexname === 'account_providerId_accountId_uidx',
  );
  assert.equal(legacyIndex, undefined);
  assert.match(identityIndex?.indexdef ?? '', /UNIQUE INDEX/);
}

async function assertMigrationMarkerPresent() {
  const result = await pool.query(
    'SELECT count(*)::integer AS count FROM migrations WHERE timestamp = $1 AND name = $2',
    [MIGRATION_TIMESTAMP, MIGRATION_NAME],
  );
  assert.equal(result.rows[0].count, 1);
}

async function assertIssuerColumn(expected) {
  const result = await pool.query(
    'SELECT count(*)::integer AS count FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2',
    ['account', 'issuer'],
  );
  assert.equal(result.rows[0].count, expected ? 1 : 0);
}

async function assertLegacyIssuer() {
  const column = await pool.query(
    'SELECT is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2',
    ['account', 'issuer'],
  );
  assert.deepEqual(column.rows, [{ is_nullable: 'NO' }]);

  const issuer = await pool.query('SELECT issuer FROM account WHERE id = $1', [ACCOUNT_ID]);
  assert.deepEqual(issuer.rows, [{ issuer: 'https://accounts.google.com' }]);
}

async function assertPersistedRows() {
  const user = await pool.query(
    'SELECT id, name, email, "emailVerified" FROM "user" WHERE id = $1',
    [USER_ID],
  );
  assert.deepEqual(user.rows, [
    { id: USER_ID, name: USER_NAME, email: EMAIL, emailVerified: true },
  ]);

  const account = await pool.query(
    'SELECT id, "accountId", "providerId", "userId" FROM account WHERE id = $1',
    [ACCOUNT_ID],
  );
  assert.deepEqual(account.rows, [
    {
      id: ACCOUNT_ID,
      accountId: PROVIDER_ACCOUNT_ID,
      providerId: ACCOUNT_PROVIDER_ID,
      userId: USER_ID,
    },
  ]);

  const session = await pool.query(
    'SELECT token, "userId", "expiresAt", "createdAt" FROM session WHERE token = $1',
    [SESSION_TOKEN],
  );
  assert.equal(session.rowCount, 1);
  assert.equal(session.rows[0].userId, USER_ID);
  assert.ok(session.rows[0].expiresAt instanceof Date);
  assert.ok(session.rows[0].expiresAt.getTime() > Date.now());
  assert.ok(session.rows[0].createdAt instanceof Date);

  const member = await pool.query('SELECT id, email, status FROM workspace_members WHERE id = $1', [
    MEMBER_ID,
  ]);
  assert.deepEqual(member.rows, [{ id: MEMBER_ID, email: EMAIL, status: 'active' }]);
}

async function assertAuthenticatedController(encodedSnapshot) {
  await assertCurrentDatabase(encodedSnapshot);
  const context = await auth.$context;
  assert.equal(typeof context.secret, 'string');
  assert.match(context.authCookies.sessionToken.name, /session_token$/);
  const signedToken = encodeURIComponent(
    SESSION_TOKEN + '.' + (await makeSignature(SESSION_TOKEN, context.secret)),
  );
  const headers = {
    cookie: context.authCookies.sessionToken.name + '=' + signedToken,
    origin: new URL(process.env.FRONTEND_URL).origin,
    accept: 'application/json',
  };

  const sessionResponse = await fetch('http://back:3000/api/auth/get-session', { headers });
  const sessionBody = await sessionResponse.text();
  assert.equal(sessionResponse.status, 200, sessionBody);
  const session = JSON.parse(sessionBody);
  assert.equal(session.session?.token, SESSION_TOKEN);
  assert.equal(session.session?.userId, USER_ID);
  assert.equal(session.user?.id, USER_ID);
  assert.equal(session.user?.email, EMAIL);

  const statusResponse = await fetch('http://back:3000/api/auth/status', { headers });
  const statusBody = await statusResponse.text();
  assert.equal(statusResponse.status, 200, statusBody);
  assert.deepEqual(JSON.parse(statusBody), {
    bootstrapNeeded: false,
    authenticated: true,
  });

  const memberResponse = await fetch('http://back:3000/api/auth/me', { headers });
  const memberBody = await memberResponse.text();
  assert.equal(memberResponse.status, 200, memberBody);
  const member = JSON.parse(memberBody);
  assert.equal(member.id, MEMBER_ID);
  assert.equal(member.email, EMAIL);
  assert.equal(member.status, 'active');
}

async function readPersistedState() {
  const user = await pool.query('SELECT * FROM "user" WHERE id = $1', [USER_ID]);
  const account = await pool.query('SELECT * FROM account WHERE id = $1', [ACCOUNT_ID]);
  const session = await pool.query('SELECT * FROM session WHERE token = $1', [SESSION_TOKEN]);
  const member = await pool.query('SELECT * FROM workspace_members WHERE id = $1', [MEMBER_ID]);
  const accountRow = account.rows[0] ? { ...account.rows[0] } : null;
  if (accountRow) delete accountRow.issuer;
  return {
    user: user.rows[0] ?? null,
    account: accountRow,
    session: session.rows[0] ?? null,
    member: member.rows[0] ?? null,
  };
}

function decodeSnapshot(encodedSnapshot) {
  assert.match(encodedSnapshot ?? '', /^[A-Za-z0-9+/]+={0,2}$/);
  const snapshot = JSON.parse(Buffer.from(encodedSnapshot, 'base64').toString('utf8'));
  assert.deepEqual(Object.keys(snapshot).sort(), ['account', 'member', 'session', 'user']);
  assert.ok(snapshot.account);
  assert.ok(snapshot.member);
  assert.ok(snapshot.session);
  assert.ok(snapshot.user);
  return snapshot;
}

function permissions() {
  return {
    dashboard: 'view',
    projects: 'edit',
    calendar: 'edit',
    documents: 'edit',
    suppliers: 'edit',
    equipment: 'edit',
    staff: 'edit',
    planning: 'edit',
  };
}
