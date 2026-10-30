import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildVerificationSteps,
  createImageTags,
  createSignalLifecycle,
  discoverNodeTestFiles,
  executeStep,
  runSteps,
  supportsNodeVersion,
} from './verify-push.mjs';

const supportedNodeRange = '^22.23.4 || ^24.22.1';

test('accepts only installed Node versions supported by the workspace engines', () => {
  assert.equal(supportsNodeVersion('v22.23.4', supportedNodeRange), true);
  assert.equal(supportsNodeVersion('22.99.0', supportedNodeRange), true);
  assert.equal(supportsNodeVersion('v24.22.1', supportedNodeRange), true);
  assert.equal(supportsNodeVersion('v22.23.3', supportedNodeRange), false);
  assert.equal(supportsNodeVersion('v23.0.0', supportedNodeRange), false);
  assert.equal(supportsNodeVersion('v24.22.0', supportedNodeRange), false);
  assert.equal(supportsNodeVersion('v24.22.1-nightly', supportedNodeRange), false);
});

test('builds unique production images once before passing their tags to E2E suites', () => {
  const images = createImageTags('0123456789abcdef01234567');
  const nodeTestFiles = discoverNodeTestFiles();
  const steps = buildVerificationSteps(images, nodeTestFiles);
  const nodeTests = steps[0];
  const stepNames = steps.map(({ name }) => name);
  const backendBuilds = steps.filter(({ imageTag }) => imageTag === images.backend);
  const frontendBuilds = steps.filter(({ imageTag }) => imageTag === images.frontend);
  const browser = steps.findIndex(({ name }) => name === 'Run Playwright browser E2E tests');
  const database = steps.findIndex(({ name }) => name === 'Run isolated database E2E tests');
  const upgrade = steps.findIndex(({ name }) => name === 'Run the production upgrade rehearsal');
  const lastImageBuild = Math.max(
    steps.findIndex(({ imageTag }) => imageTag === images.backend),
    steps.findIndex(({ imageTag }) => imageTag === images.frontend),
  );

  assert.equal(nodeTests.executable, process.execPath);
  assert.deepEqual(nodeTests.args, ['--test', ...nodeTestFiles]);
  assert.deepEqual(stepNames, [
    'Run local Node regression tests',
    'Run uncached unit tests',
    'Run backend integration tests',
    'Run backend HTTP E2E tests',
    'Build host production artifacts',
    'Build production backend test image',
    'Build production frontend test image',
    'Run isolated database E2E tests',
    'Run the production upgrade rehearsal',
    'Run Playwright browser E2E tests',
    'Typecheck Playwright E2E tests',
    'Typecheck the workspace',
    'Run uncached lint',
    'Run repository and release checks',
  ]);
  assert.equal(backendBuilds.length, 1);
  assert.equal(frontendBuilds.length, 1);
  assert.ok(lastImageBuild < database);
  assert.ok(lastImageBuild < upgrade);
  assert.ok(lastImageBuild < browser);
  for (const step of steps.filter(({ environment }) => environment)) {
    assert.equal(step.environment.LEDGERLY_E2E_BACK_IMAGE, images.backend);
    assert.equal(step.environment.LEDGERLY_E2E_FRONT_IMAGE, images.frontend);
  }
  for (const name of [
    'Run uncached unit tests',
    'Build host production artifacts',
    'Run uncached lint',
  ]) {
    assert.ok(steps.find((step) => step.name === name).args.includes('--force'));
  }
  assert.throws(() => createImageTags('unsafe-tag'), /lowercase hexadecimal/);
});

test('discovers the root, isolated stack, scanner protocol, and runtime inventory tests', () => {
  const nodeTests = discoverNodeTestFiles();

  assert.ok(nodeTests.includes('scripts/verify-push.test.mjs'));
  assert.ok(nodeTests.includes('scripts/ensure-development-env.test.mjs'));
  assert.ok(nodeTests.includes('deploy/scripts/verify-ledgerly-runtime.test.mjs'));
  assert.ok(
    nodeTests.some((file) => file.startsWith('scripts/test/e2e/') && file.endsWith('.test.mjs')),
  );
  assert.ok(
    nodeTests.some((file) => file.startsWith('deploy/test/e2e/') && file.endsWith('.test.mjs')),
  );
});

test('stops after the first failed step without retrying it', async () => {
  const executed = [];
  const steps = [{ name: 'first' }, { name: 'failing' }, { name: 'never-run' }];

  await assert.rejects(
    runSteps(steps, async ({ name }) => {
      executed.push(name);
      if (name === 'failing') throw new Error('synthetic failure');
    }),
    /synthetic failure/,
  );

  assert.deepEqual(executed, ['first', 'failing']);
});

test('aborts local verification on SIGINT or SIGTERM and removes its listeners', () => {
  const signalTarget = new EventEmitter();
  const lifecycle = createSignalLifecycle(signalTarget);

  signalTarget.emit('SIGTERM');

  assert.equal(lifecycle.signal.aborted, true);
  assert.equal(lifecycle.signalName, 'SIGTERM');
  lifecycle.dispose();
  assert.equal(signalTarget.listenerCount('SIGINT'), 0);
  assert.equal(signalTarget.listenerCount('SIGTERM'), 0);
});

test('fails closed when a required Node test directory has zero discovered tests', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ledgerly-empty-node-tests-'));
  mkdirSync(path.join(root, 'scripts'));

  try {
    assert.throws(
      () => discoverNodeTestFiles(root),
      /No local Node tests were discovered in scripts/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('terminates and awaits an active command after local verification receives SIGINT', async () => {
  const signalTarget = new EventEmitter();
  const lifecycle = createSignalLifecycle(signalTarget);
  const artifactDirectory = mkdtempSync(path.join(tmpdir(), 'ledgerly-verify-push-'));

  try {
    const runningCommand = executeStep(
      {
        name: 'long-running local command',
        executable: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000)'],
      },
      0,
      artifactDirectory,
      process.cwd(),
      lifecycle.signal,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    signalTarget.emit('SIGINT');

    await assert.rejects(runningCommand, /signal SIGTERM/);
    assert.equal(lifecycle.signalName, 'SIGINT');
  } finally {
    lifecycle.dispose();
    rmSync(artifactDirectory, { recursive: true, force: true });
  }
});
