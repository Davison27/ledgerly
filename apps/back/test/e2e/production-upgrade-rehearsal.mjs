import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { withIsolatedStack } from '../../../../scripts/test/e2e/isolated-stack.mjs';

const fixturePath = '/fixture/production-upgrade-fixture.mjs';
const runtimeInventoryPath = '/tmp/verify-ledgerly-runtime.mjs';
const applicationProfile = ['application'];
const backendRuntimeCheck = [
  "import assert from 'node:assert/strict';",
  "assert.equal(process.version, 'v22.23.4');",
  "assert.equal(process.env.NODE_ENV, 'production');",
  "assert.equal(process.env.DB_HOST, 'postgres');",
  "assert.match(process.env.DB_NAME ?? '', /^ledgerly_e2e_[a-f0-9]{12}$/);",
  "assert.match(process.env.FRONTEND_URL ?? '', /^https:\\/\\/localhost:\\d+$/);",
  'assert.equal(process.env.BACKEND_PUBLIC_URL, process.env.FRONTEND_URL);',
  "assert.equal(process.env.COOKIE_SECURE, 'true');",
  "assert.equal(process.env.TRUST_PROXY, 'true');",
  "assert.match(process.env.GOOGLE_CLIENT_ID ?? '', /^e2e-[a-f0-9]{12}\\.apps\\.googleusercontent\\.com$/);",
  "assert.ok((process.env.GOOGLE_CLIENT_SECRET ?? '').length >= 40);",
  "const readiness = await fetch('http://127.0.0.1:3000/api/health/ready');",
  'const body = await readiness.text();',
  'assert.equal(readiness.status, 200, body);',
  "assert.equal(JSON.parse(body).status, 'ok');",
  "const socialResponse = await fetch('http://127.0.0.1:3000/api/auth/sign-in/social', { method: 'POST', headers: { 'content-type': 'application/json', origin: process.env.FRONTEND_URL }, body: JSON.stringify({ provider: 'google', callbackURL: new URL('/', process.env.FRONTEND_URL).toString() }) });",
  'const socialBody = await socialResponse.text();',
  'assert.equal(socialResponse.status, 200, socialBody);',
  'const socialResult = JSON.parse(socialBody);',
  "assert.equal(typeof socialResult.url, 'string');",
  'const authorizationUrl = new URL(socialResult.url);',
  "assert.equal(authorizationUrl.origin, 'https://accounts.google.com');",
  "assert.equal(authorizationUrl.searchParams.get('client_id'), process.env.GOOGLE_CLIENT_ID);",
  "assert.equal(authorizationUrl.searchParams.get('redirect_uri'), new URL('/api/auth/callback/google', process.env.FRONTEND_URL).toString());",
  "assert.ok((authorizationUrl.searchParams.get('state') ?? '').length > 16);",
].join('\n');

assert.ok(process.env.LEDGERLY_E2E_BACK_IMAGE, 'The local production backend image is required.');

await runScenario('fresh');
await runScenario('legacy');
process.stdout.write(
  'Production upgrade rehearsal passed for fresh and populated legacy databases.\n',
);

async function runScenario(scenario) {
  const databaseName = 'ledgerly_e2e_' + randomBytes(6).toString('hex');

  await withIsolatedStack(
    {
      databaseName,
      services: ['postgres', 'migrator', 'fixture', 'back'],
      profiles: applicationProfile,
    },
    async (stack, { signal }) => {
      await stack.up({ services: ['postgres'], profiles: applicationProfile, signal });
      await assertRuntimeInventory(stack, signal);
      await runMigrator(stack, 'auto', signal);
      await runMigrator(stack, 'verify', signal);

      let fixtureSnapshot;
      if (scenario === 'fresh') {
        await runFixture(stack, 'assert-fresh', signal);
        fixtureSnapshot = (await runFixture(stack, 'prepare-current', signal)).snapshot;
        assert.match(fixtureSnapshot ?? '', /^[A-Za-z0-9+/]+={0,2}$/);
        await runMigrator(stack, 'auto', signal);
        await runMigrator(stack, 'verify', signal);
        await runFixture(stack, 'assert-current', signal, [fixtureSnapshot]);
      } else {
        const fixtureState = await runFixture(stack, 'prepare-legacy', signal);
        fixtureSnapshot = fixtureState.snapshot;
        assert.match(fixtureSnapshot ?? '', /^[A-Za-z0-9+/]+={0,2}$/);
        await runMigrator(stack, 'auto', signal);
        await runMigrator(stack, 'verify', signal);
        await runFixture(stack, 'assert-upgraded', signal, [fixtureSnapshot]);
        await runMigrator(stack, 'auto', signal);
        await runMigrator(stack, 'verify', signal);
        await runFixture(stack, 'assert-upgraded', signal, [fixtureSnapshot]);
      }

      await stack.up({ services: ['back'], profiles: applicationProfile, signal });
      await stack.exec('back', ['node', '--input-type=module', '--eval', backendRuntimeCheck], {
        signal,
      });
      await runFixture(stack, 'auth-smoke', signal, [fixtureSnapshot]);
    },
  );
}

async function assertRuntimeInventory(stack, signal) {
  const output = await stack.run('fixture', [runtimeInventoryPath, '/app'], { signal });
  assert.match(
    output,
    /Runtime inventory passed: 0 forbidden packages; root Multer 2\.5\.0; Nest adapter Multer 2\.5\.0\./,
  );
}

async function runMigrator(stack, mode, signal) {
  await stack.run('migrator', ['--mode=' + mode], { signal });
}

async function runFixture(stack, mode, signal, args = []) {
  const output = await stack.run('fixture', [fixturePath, mode, ...args], { signal });
  const resultLine = output
    .trimEnd()
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith('LEDGERLY_PRODUCTION_UPGRADE_FIXTURE:'));
  assert.ok(resultLine, 'The production upgrade fixture did not complete mode ' + mode + '.');
  const result = JSON.parse(resultLine.slice('LEDGERLY_PRODUCTION_UPGRADE_FIXTURE:'.length));
  assert.equal(result.mode, mode);
  return result;
}
