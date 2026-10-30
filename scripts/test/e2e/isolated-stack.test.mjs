import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalDocker, withIsolatedStack } from './isolated-stack.mjs';
import {
  createPlaywrightEnvironment,
  openControlBridge,
} from '../../../apps/front/e2e/support/run-playwright.mjs';

const projectLabel = 'com.docker.compose.project';
const ownerLabel = 'com.ledgerly.e2e.owner';
const ownedProjectLabel = 'com.ledgerly.e2e.project';
const fixturePath = new URL('../../../deploy/test/e2e/clamd-fixture.mjs', import.meta.url).pathname;
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function createDocker({ invalidOwnership = false, failUp = false } = {}) {
  const commands = [];
  const state = { projectName: undefined, started: false, down: false, databasePort: undefined };
  const runCommand = async (args, options = {}) => {
    commands.push({ args, options });
    if (args[0] === 'context' && args[1] === 'show') return 'default';
    if (args[0] === 'context' && args[1] === 'inspect') {
      return JSON.stringify([{ Endpoints: { docker: { Host: 'unix:///var/run/docker.sock' } } }]);
    }
    if (args[0] === 'compose' && args[1] === 'version') return '2.40.0';
    if (args[0] === 'info') return '29.9.1';
    if (args[0] === 'image' && args[1] === 'inspect') return '';
    if (args[0] === 'compose') {
      const operation = args.find((argument) =>
        ['config', 'up', 'run', 'port', 'exec', 'logs', 'down'].includes(argument),
      );
      if (operation === 'config') {
        const projectIndex = args.indexOf('--project-name') + 1;
        state.projectName = args[projectIndex];
        const labels = {
          [ownerLabel]: 'isolated-stack',
          [ownedProjectLabel]: state.projectName,
        };
        const backendEnvironment = {
          NODE_ENV: 'production',
          FRONTEND_URL: options.env.E2E_APP_ORIGIN,
          BACKEND_PUBLIC_URL: options.env.E2E_APP_ORIGIN,
          BOOTSTRAP_ADMIN_EMAIL: options.env.E2E_BOOTSTRAP_ADMIN_EMAIL,
          GOOGLE_CLIENT_ID: options.env.E2E_GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: options.env.E2E_GOOGLE_CLIENT_SECRET,
          COOKIE_SECURE: 'true',
          TRUST_PROXY: 'true',
          CLAMAV_ENABLED: 'true',
        };
        const appService = {
          profiles: ['application'],
          networks: { default: null },
          labels,
        };
        const services = {
          postgres: {
            labels,
            ports: [
              {
                host_ip: '127.0.0.1',
                target: 5432,
                published: options.env.E2E_DB_PUBLISHED_PORT,
              },
            ],
            networks: { default: null, 'host-access': null },
          },
          clamav: {
            ...appService,
            profiles: ['malware'],
            read_only: true,
            volumes: [
              {
                type: 'bind',
                source: fixturePath,
                target: '/fixture/clamd-fixture.mjs',
                read_only: true,
              },
            ],
          },
          back: {
            ...appService,
            pull_policy: 'never',
            image: options.env.LEDGERLY_E2E_BACK_IMAGE,
            environment: backendEnvironment,
          },
          front: {
            ...appService,
            pull_policy: 'never',
            image: options.env.LEDGERLY_E2E_FRONT_IMAGE,
          },
          proxy: {
            ...appService,
            read_only: true,
            tmpfs: [
              '/tmp:rw,noexec,nosuid,nodev,size=16m',
              '/data:rw,noexec,nosuid,nodev,size=32m,uid=0,gid=0,mode=700',
              '/config:rw,noexec,nosuid,nodev,size=8m,uid=0,gid=0,mode=700',
            ],
            ports: [
              {
                host_ip: '127.0.0.1',
                target: 443,
                published: options.env.E2E_PROXY_PUBLISHED_PORT,
              },
            ],
            volumes: [
              {
                type: 'bind',
                source: join(repositoryRoot, 'deploy/test/Caddyfile.e2e'),
                target: '/etc/caddy/Caddyfile',
                read_only: true,
              },
            ],
            networks: { default: null, 'host-access': null },
          },
          migrator: {
            ...appService,
            pull_policy: 'never',
            image: options.env.LEDGERLY_E2E_BACK_IMAGE,
            environment: backendEnvironment,
          },
          fixture: {
            ...appService,
            pull_policy: 'never',
            image: options.env.LEDGERLY_E2E_BACK_IMAGE,
            environment: backendEnvironment,
            volumes: [
              {
                type: 'bind',
                source: join(repositoryRoot, 'apps/back/test/e2e'),
                target: '/fixture',
                read_only: true,
              },
              {
                type: 'bind',
                source: join(repositoryRoot, 'deploy/scripts/verify-ledgerly-runtime.mjs'),
                target: '/tmp/verify-ledgerly-runtime.mjs',
                read_only: true,
              },
            ],
          },
        };
        return JSON.stringify({
          services,
          networks: {
            default: {
              internal: true,
              labels,
            },
            'host-access': {
              driver: 'bridge',
              labels,
            },
          },
        });
      }
      if (operation === 'up') {
        if (failUp) throw new Error('proxy exited (1)');
        state.databasePort = options.env.E2E_DB_PUBLISHED_PORT;
        state.started = true;
        return '';
      }
      if (operation === 'logs') return 'proxy failed to load its local TLS certificate';
      if (operation === 'run') return 'fixture result';
      if (operation === 'port') return '127.0.0.1:45833';
      if (operation === 'exec') return 'exec result';
      if (operation === 'down') {
        state.down = true;
        state.started = false;
        return '';
      }
    }
    if (args[0] === 'ps') return state.started ? 'container-id' : '';
    if (args[0] === 'inspect') {
      const labels = {
        [projectLabel]: state.projectName,
        [ownerLabel]: 'isolated-stack',
        [ownedProjectLabel]: invalidOwnership ? 'another-project' : state.projectName,
        'com.docker.compose.service': 'postgres',
      };
      return JSON.stringify([
        {
          Config: { Labels: labels },
          NetworkSettings: {
            Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: state.databasePort }] },
          },
        },
      ]);
    }
    if (args[0] === 'network' && args[1] === 'ls') {
      return state.started ? 'network-internal\nnetwork-host-access' : '';
    }
    if (args[0] === 'network' && args[1] === 'inspect') {
      return JSON.stringify(
        args.slice(2).map(() => ({
          Labels: {
            [projectLabel]: state.projectName,
            [ownerLabel]: 'isolated-stack',
            [ownedProjectLabel]: invalidOwnership ? 'another-project' : state.projectName,
          },
        })),
      );
    }
    throw new Error(`Unexpected Docker command: ${args.join(' ')}`);
  };
  return { commands, runCommand, state };
}

test('rejects a Docker context that targets a remote daemon', async () => {
  const commands = [];
  await assert.rejects(
    assertLocalDocker({
      sourceEnvironment: { PATH: '/usr/bin', DOCKER_CONTEXT: 'production' },
      runCommand: async (args) => {
        commands.push(args);
        return JSON.stringify([{ Endpoints: { docker: { Host: 'ssh://vps.example.com' } } }]);
      },
    }),
    /non-local Docker endpoint/,
  );
  assert.equal(
    commands.some((args) => args[0] === 'info'),
    false,
  );
});

test('refuses externally supplied database endpoints before invoking Docker', async () => {
  let dockerCalled = false;
  await assert.rejects(
    withIsolatedStack({}, async () => {}, {
      sourceEnvironment: { DATABASE_URL: 'postgresql://production/db' },
      runCommand: async () => {
        dockerCalled = true;
        throw new Error('Docker must not be called.');
      },
    }),
    /Unset external database settings.*DATABASE_URL/,
  );
  assert.equal(dockerCalled, false);
});

test('runs only owned services and removes the generated project after success', async () => {
  const docker = createDocker();
  const result = await withIsolatedStack(
    { services: ['postgres', 'clamav'], profiles: ['malware'] },
    async (stack) => {
      await stack.up();
      const database = new URL(stack.databaseUrl);
      assert.equal(database.hostname, '127.0.0.1');
      assert.equal(database.port, docker.state.databasePort);
      assert.equal(database.pathname, '/ledgerly_migration_test');
      assert.match(stack.environment.DB_PASSWORD, /^[A-Za-z0-9_-]+$/);
      assert.equal(stack.environment.CLAMAV_ENABLED, 'true');
      assert.equal(await stack.exec('postgres', ['psql', '--version']), 'exec result');
      return stack.projectName;
    },
    {
      sourceEnvironment: { PATH: '/usr/bin' },
      runCommand: docker.runCommand,
    },
  );

  assert.equal(result, docker.state.projectName);
  assert.match(result, /^ledgerly-e2e-[a-f0-9]{16}$/);
  const config = docker.commands.find(({ args }) => args.includes('config'))?.args;
  assert.ok(config);
  assert.ok(
    config.some(
      (argument, index) => argument === '--profile' && config[index + 1] === 'application',
    ),
  );
  assert.ok(
    config.some((argument, index) => argument === '--profile' && config[index + 1] === 'malware'),
  );
  const up = docker.commands.find(({ args }) => args.includes('up'))?.args;
  assert.ok(up);
  assert.ok(up.some((argument, index) => argument === '--profile' && up[index + 1] === 'malware'));
  assert.equal(
    up.some((argument, index) => argument === '--profile' && up[index + 1] === 'application'),
    false,
  );
  const down = docker.commands.find(({ args }) => args.includes('down'))?.args;
  assert.ok(down);
  assert.ok(down.includes('--volumes'));
  assert.ok(down.includes('--remove-orphans'));
  assert.equal(down[down.indexOf('--project-name') + 1], result);
  assert.equal(
    docker.commands.some(({ args }) => args.includes('ledgerly-postgres')),
    false,
  );
});

test('runs the migration service from the prebuilt local backend image and returns stdout', async () => {
  const docker = createDocker();
  let origin;
  const output = await withIsolatedStack(
    { services: ['postgres'], profiles: ['application'] },
    async (stack) => {
      await stack.up();
      origin = stack.origin;
      assert.match(origin, /^https:\/\/localhost:\d+$/);
      assert.match(stack.environment.BOOTSTRAP_ADMIN_EMAIL, /^e2e-admin-[a-f0-9]+@example\.com$/);
      return stack.run('migrator', ['--mode=auto']);
    },
    {
      sourceEnvironment: {
        PATH: '/usr/bin',
        LEDGERLY_E2E_BACK_IMAGE: 'ledgerly-test-back:local',
        LEDGERLY_E2E_FRONT_IMAGE: 'ledgerly-test-front:local',
      },
      runCommand: docker.runCommand,
    },
  );

  assert.equal(output, 'fixture result');
  assert.ok(
    docker.commands.some(
      ({ args }) =>
        args.includes('run') &&
        args.includes('--no-deps') &&
        args.includes('migrator') &&
        args.includes('--mode=auto'),
    ),
  );
  assert.ok(
    docker.commands.some(
      ({ args }) => args[0] === 'image' && args.includes('ledgerly-test-back:local'),
    ),
  );
});

test('includes isolated service logs when readiness fails', async () => {
  const docker = createDocker({ failUp: true });
  await assert.rejects(
    withIsolatedStack({ services: ['postgres'] }, (stack) => stack.up(), {
      sourceEnvironment: { PATH: '/usr/bin' },
      runCommand: docker.runCommand,
    }),
    /proxy exited \(1\)\nIsolated E2E service logs:\nproxy failed to load its local TLS certificate/,
  );
  const logs = docker.commands.find(({ args }) => args.includes('logs'))?.args;
  assert.ok(logs);
  assert.equal(logs.includes('--project-name'), true);
  assert.equal(docker.state.down, true);
});

test('generates isolated Google credentials without inheriting provider credentials', async () => {
  const docker = createDocker();
  await withIsolatedStack(
    { services: ['postgres'], profiles: ['application'] },
    async (stack) => {
      await stack.up();
    },
    {
      sourceEnvironment: {
        PATH: '/usr/bin',
        GOOGLE_CLIENT_ID: 'developer-client-id',
        GOOGLE_CLIENT_SECRET: 'developer-client-secret',
        E2E_GOOGLE_CLIENT_ID: 'external-test-client-id',
        E2E_GOOGLE_CLIENT_SECRET: 'external-test-client-secret',
      },
      runCommand: docker.runCommand,
    },
  );

  const composeEnvironment = docker.commands.find(
    ({ args }) => args[0] === 'compose' && args.includes('config'),
  )?.options.env;
  assert.ok(composeEnvironment);
  assert.match(
    composeEnvironment.E2E_GOOGLE_CLIENT_ID,
    /^e2e-[a-f0-9]{12}\.apps\.googleusercontent\.com$/,
  );
  assert.match(composeEnvironment.E2E_GOOGLE_CLIENT_SECRET, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(composeEnvironment.E2E_GOOGLE_CLIENT_ID, 'external-test-client-id');
  assert.notEqual(composeEnvironment.E2E_GOOGLE_CLIENT_SECRET, 'external-test-client-secret');
  assert.equal(composeEnvironment.GOOGLE_CLIENT_ID, undefined);
  assert.equal(composeEnvironment.GOOGLE_CLIENT_SECRET, undefined);
});

test('restricts the browser fixture bridge to an authorized reset payload', async () => {
  const token = 'fixture-bridge-token-with-more-than-forty-characters';
  const localCa = '-----BEGIN CERTIFICATE-----\nsynthetic-local-ca\n-----END CERTIFICATE-----\n';
  const resetResult = {
    actors: {},
    bootstrapEmail: 'e2e-admin-0123456789ab@example.com',
    currentReleaseVersion: '1.4.2',
    ids: {},
    infectedMarker: 'E2E-INFECTED-MARKER',
  };
  const calls = [];
  const stack = {
    environment: { BOOTSTRAP_ADMIN_EMAIL: resetResult.bootstrapEmail },
    origin: 'https://localhost:45833',
    run: async (service, args) => {
      calls.push({ service, args });
      return `LEDGERLY_PLAYWRIGHT_FIXTURE:${JSON.stringify(resetResult)}`;
    },
  };
  const bridge = await openControlBridge(stack, token, '1.4.2', localCa);

  try {
    const unauthorized = await fetch(`${bridge.url}/reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario: 'fresh', acknowledgeRelease: true }),
    });
    assert.equal(unauthorized.status, 401);

    const invalidSchema = await fetch(`${bridge.url}/reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        scenario: 'fresh',
        acknowledgeRelease: true,
        testClientAddress: '198.18.4.8',
        databaseUrl: 'postgresql://external.example/database',
      }),
    });
    assert.equal(invalidSchema.status, 400);

    const invalidClientAddress = await fetch(`${bridge.url}/reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        scenario: 'fresh',
        acknowledgeRelease: true,
        testClientAddress: '8.8.8.8',
      }),
    });
    assert.equal(invalidClientAddress.status, 400);

    const methodNotAllowed = await fetch(`${bridge.url}/reset`, { method: 'GET' });
    assert.equal(methodNotAllowed.status, 405);
    const notFound = await fetch(`${bridge.url}/other`, { method: 'POST' });
    assert.equal(notFound.status, 404);
    assert.equal(calls.length, 0);

    const accepted = await fetch(`${bridge.url}/reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        scenario: 'fresh',
        acknowledgeRelease: false,
        testClientAddress: '198.18.42.12',
      }),
    });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), {
      ...resetResult,
      origin: stack.origin,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].service, 'fixture');
    assert.equal(calls[0].args[0], '/fixture/playwright-fixture.mjs');
    assert.equal(calls[0].args[1], 'reset');
    assert.deepEqual(JSON.parse(Buffer.from(calls[0].args[2], 'base64url').toString('utf8')), {
      scenario: 'fresh',
      acknowledgeRelease: false,
      currentReleaseVersion: '1.4.2',
      origin: stack.origin,
      testClientAddress: '198.18.42.12',
    });
    assert.equal(Buffer.from(calls[0].args[3], 'base64').toString('utf8'), localCa);
  } finally {
    await new Promise((resolve, reject) => {
      bridge.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('starts Playwright with only local runtime and fixture bridge environment values', () => {
  const names = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'PLAYWRIGHT_BROWSERS_PATH',
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.DATABASE_URL = 'postgresql://should-not-be-inherited';
  process.env.GOOGLE_CLIENT_SECRET = 'should-not-be-inherited';
  process.env.OPENAI_API_KEY = 'should-not-be-inherited';
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/local/browser/cache';

  try {
    const environment = createPlaywrightEnvironment({
      bridgeUrl: 'http://127.0.0.1:12345',
      bridgeToken: 'fixture-bridge-token-with-more-than-forty-characters',
      caPath: '/private/tmp/ledgerly-ca.pem',
    });
    assert.deepEqual(
      Object.keys(environment).sort(),
      [
        ...[
          'CI',
          'FORCE_COLOR',
          'HOME',
          'LANG',
          'LC_ALL',
          'NODE_EXTRA_CA_CERTS',
          'PATH',
          'PLAYWRIGHT_BROWSERS_PATH',
          'TEMP',
          'TMP',
          'TMPDIR',
          'LEDGERLY_E2E_CONTROL_URL',
          'LEDGERLY_E2E_CONTROL_TOKEN',
        ].filter((name) => environment[name] !== undefined),
      ].sort(),
    );
    assert.equal(environment.DATABASE_URL, undefined);
    assert.equal(environment.GOOGLE_CLIENT_SECRET, undefined);
    assert.equal(environment.OPENAI_API_KEY, undefined);
    assert.equal(environment.PLAYWRIGHT_BROWSERS_PATH, '/local/browser/cache');
    assert.equal(environment.NODE_EXTRA_CA_CERTS, '/private/tmp/ledgerly-ca.pem');
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('keeps one-off migration and fixture services out of Compose up', async () => {
  let dockerCalled = false;
  await assert.rejects(
    withIsolatedStack(
      { services: ['postgres', 'migrator'], profiles: ['application'] },
      async (stack) => stack.up(),
      {
        sourceEnvironment: { PATH: '/usr/bin' },
        runCommand: async () => {
          dockerCalled = true;
          throw new Error('Docker must not be called.');
        },
      },
    ),
    /One-off migration and fixture services must run through stack\.run/,
  );
  assert.equal(dockerCalled, false);
});

test('refuses cleanup when a container does not carry both generated ownership labels', async () => {
  const docker = createDocker({ invalidOwnership: true });
  await assert.rejects(
    withIsolatedStack({}, async (stack) => stack.up(), {
      sourceEnvironment: { PATH: '/usr/bin' },
      runCommand: docker.runCommand,
    }),
    (error) =>
      error instanceof AggregateError &&
      error.errors.some((entry) => /ownership validation/.test(entry.message)),
  );
  assert.equal(
    docker.commands.some(({ args }) => args.includes('down')),
    false,
  );
});
