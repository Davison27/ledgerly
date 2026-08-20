import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  resolveResetPlan,
  runResetPlan,
} from './reset-development-database.mjs';

const fixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/reset-development-database/${name}.json`, import.meta.url), 'utf8'),
  );

const clone = (value) => structuredClone(value);

const validInput = (resources = fixture('empty')) => ({
  confirmation: 'RESET_LEDGERLY_DEV',
  deployEnvironmentExists: false,
  composePath: 'apps/back/docker-compose.yml',
  environmentFileExists: true,
  environment: {
    NODE_ENV: 'development',
    DB_HOST: 'postgres',
    DB_NAME: 'ledgerly',
    DB_USER: 'ledgerly',
  },
  composeProjectOverride: undefined,
  dockerHost: undefined,
  context: {
    name: 'default',
    endpoint: 'unix:///var/run/docker.sock',
  },
  composeConfig: {
    volumes: {
      'ledgerly-pgdata': {},
    },
    services: {
      postgres: {
        volumes: [
          {
            type: 'volume',
            source: 'ledgerly-pgdata',
            target: '/var/lib/postgresql/data',
          },
        ],
      },
    },
  },
  resources,
});

const plan = (input) => resolveResetPlan(validInput(input));

test('selects the one-time legacy transition only for the exact legacy topology', () => {
  const result = plan(fixture('legacy'));

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'legacy-transition');
  assert.deepEqual(result.inspection.volume, {
    name: 'back_ledgerly-pgdata',
    labels: {
      'com.docker.compose.project': 'back',
      'com.docker.compose.volume': 'ledgerly-pgdata',
    },
  });
});

test('selects the future reset only for the fixed ledgerly-dev topology', () => {
  const result = plan(fixture('future'));

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'future-reset');
  assert.equal(result.inspection.container.name, 'ledgerly-postgres');
});

test('selects a non-destructive ledgerly-dev bootstrap with no local resources', () => {
  const result = plan(fixture('empty'));

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'bootstrap');
  assert.equal(result.commands.some((command) => command.kind === 'down'), false);
});

test('refuses both legacy and future states before producing a destructive command', () => {
  const resources = fixture('legacy');
  const future = fixture('future');
  resources.containers.push(...future.containers);
  resources.networks.push(...future.networks);
  resources.volumes.push(...future.volumes);
  resources.volumeConsumers.push(...future.volumeConsumers);

  const result = plan(resources);

  assert.equal(result.ok, false);
  assert.equal(result.commands.length, 0);
});

test('refuses a repeat legacy attempt after ledgerly-dev resources exist', () => {
  const resources = fixture('legacy');
  resources.volumes.push(...fixture('future').volumes);

  const result = plan(resources);

  assert.equal(result.ok, false);
  assert.equal(result.commands.length, 0);
});

test('refuses missing or wrong labels, mounts, shared volumes, and extra resources', () => {
  const cases = [
    (resources) => delete resources.volumes[0].labels['com.docker.compose.volume'],
    (resources) => {
      resources.containers[0].mounts[0].source = 'wrong-volume';
    },
    (resources) => {
      resources.containers[0].mounts[0].destination = '/wrong';
    },
    (resources) => {
      resources.containers[0].mounts[0].type = 'bind';
    },
    (resources) => {
      resources.containers[0].mounts.push({
        type: 'volume',
        source: 'back_ledgerly-pgdata',
        destination: '/another-data-directory',
      });
    },
    (resources) => resources.volumeConsumers.push('shared-container-id'),
    (resources) =>
      resources.containers.push({
        id: 'unexpected-id',
        name: 'back-unexpected-1',
        labels: {
          'com.docker.compose.project': 'back',
          'com.docker.compose.service': 'worker',
        },
        mounts: [],
      }),
  ];

  for (const mutate of cases) {
    const resources = clone(fixture('legacy'));
    mutate(resources);

    const result = plan(resources);

    assert.equal(result.ok, false);
    assert.equal(result.commands.length, 0);
  }
});

test('refuses missing confirmation, deployment state, database mismatches, and project overrides', () => {
  const inputs = [
    { confirmation: '' },
    { deployEnvironmentExists: true },
    { environment: { ...validInput().environment, NODE_ENV: 'production' } },
    { environment: { ...validInput().environment, DB_HOST: 'remote.example' } },
    { environment: { ...validInput().environment, DB_NAME: 'other' } },
    { environment: { ...validInput().environment, DB_USER: 'other' } },
    { composeProjectOverride: 'back' },
  ];

  for (const override of inputs) {
    const input = validInput(fixture('legacy'));
    Object.assign(input, override);

    const result = resolveResetPlan(input);

    assert.equal(result.ok, false);
    assert.equal(result.commands.length, 0);
  }
});

test('refuses TCP, SSH, and deceptive default-context remote endpoints while accepting a local Unix socket', () => {
  const unsafeContexts = [
    { dockerHost: 'tcp://127.0.0.1:2375' },
    { dockerHost: 'ssh://docker@example.test' },
    { context: { name: 'default', endpoint: 'tcp://remote.example:2376' } },
    { context: { name: 'remote', endpoint: 'unix:///var/run/docker.sock' } },
  ];

  for (const override of unsafeContexts) {
    const input = validInput(fixture('legacy'));
    Object.assign(input, override);

    const result = resolveResetPlan(input);

    assert.equal(result.ok, false);
    assert.equal(result.commands.length, 0);
  }

  assert.equal(plan(fixture('legacy')).ok, true);
});

test('refuses ambiguous Compose definitions and future-volume topology violations', () => {
  const extraVolume = validInput(fixture('legacy'));
  extraVolume.composeConfig.volumes.extra = {};
  assert.equal(resolveResetPlan(extraVolume).ok, false);

  const bindDataMount = validInput(fixture('legacy'));
  bindDataMount.composeConfig.services.postgres.volumes[0].type = 'bind';
  assert.equal(resolveResetPlan(bindDataMount).ok, false);

  const future = fixture('future');
  future.volumeConsumers.push('other-container-id');
  assert.equal(plan(future).ok, false);
});

test('runs legacy transition and future reset in guarded command order', async () => {
  const invocations = [];
  const operations = {
    execute: async (command) => invocations.push(command.kind),
    assertAbsent: async (inspection) => invocations.push(`absent:${inspection.project}`),
  };

  await runResetPlan(plan(fixture('legacy')), operations);
  await runResetPlan(plan(fixture('future')), operations);

  assert.deepEqual(invocations, [
    'down',
    'absent:back',
    'postgres-up',
    'migrate',
    'back-up',
    'down',
    'absent:ledgerly-dev',
    'postgres-up',
    'migrate',
    'back-up',
  ]);
});

test('stops the runner before every command for an unsafe plan and propagates removal or recreation failures', async () => {
  const unsafe = plan(fixture('legacy'));
  unsafe.ok = false;
  unsafe.commands = [];

  await assert.rejects(runResetPlan(unsafe, { execute: async () => assert.fail('called') }));

  const failedRemoval = {
    execute: async () => {
      throw new Error('down failed');
    },
    assertAbsent: async () => assert.fail('called'),
  };
  await assert.rejects(runResetPlan(plan(fixture('legacy')), failedRemoval), /down failed/);

  const failedBootstrap = {
    execute: async (command) => {
      if (command.kind === 'postgres-up') {
        throw new Error('bootstrap failed');
      }
    },
    assertAbsent: async () => undefined,
  };
  await assert.rejects(runResetPlan(plan(fixture('future')), failedBootstrap), /bootstrap failed/);
});
