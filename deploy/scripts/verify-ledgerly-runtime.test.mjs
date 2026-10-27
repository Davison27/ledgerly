import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyRuntimeInventory } from './verify-ledgerly-runtime.mjs';
import pnpmfile from '../../.pnpmfile.cjs';

const writePackage = async (directory, name, version) => {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name, version }));
  await writeFile(join(directory, 'index.js'), '');
};

const createRuntimeFixture = async ({ rootMulterVersion = '2.5.0', adapterMulterVersion = '2.5.0' } = {}) => {
  const appRoot = await mkdtemp(join(tmpdir(), 'ledgerly-runtime-inventory-'));
  const nodeModules = join(appRoot, 'node_modules');
  const rootMulterStore = join(nodeModules, '.pnpm/multer@root/node_modules/multer');
  const adapterDirectory = join(
    nodeModules,
    '.pnpm/@nestjs+platform-express@11.2.8/node_modules/@nestjs/platform-express',
  );

  await writePackage(rootMulterStore, 'multer', rootMulterVersion);
  await mkdir(join(nodeModules, '@nestjs'), { recursive: true });
  await symlink(rootMulterStore, join(nodeModules, 'multer'), 'dir');
  await writePackage(adapterDirectory, '@nestjs/platform-express', '11.2.8');
  await writePackage(join(adapterDirectory, 'node_modules/multer'), 'multer', adapterMulterVersion);
  await symlink(adapterDirectory, join(nodeModules, '@nestjs/platform-express'), 'dir');

  return appRoot;
};

test('accepts the production runtime when both Multer contexts are patched', async () => {
  const appRoot = await createRuntimeFixture();

  try {
    assert.deepEqual(await verifyRuntimeInventory(appRoot), {
      forbiddenPackages: 0,
      rootMulterVersion: '2.5.0',
      adapterMulterVersion: '2.5.0',
    });
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test('rejects test tooling nested in the physical pnpm store', async () => {
  const appRoot = await createRuntimeFixture();
  const hiddenPackage = join(appRoot, 'node_modules/.pnpm/vitest@3.2.7/node_modules/vitest');

  try {
    await writePackage(hiddenPackage, 'vitest', '3.2.7');
    await assert.rejects(verifyRuntimeInventory(appRoot), /vitest/);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test('rejects a vulnerable Multer nested under the Nest platform adapter', async () => {
  const appRoot = await createRuntimeFixture({ adapterMulterVersion: '2.4.0' });

  try {
    await assert.rejects(verifyRuntimeInventory(appRoot), /found 2\.5\.0 and 2\.4\.0/);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test('removes only Better Auth 1.7.12 optional Vitest peer metadata', () => {
  const target = {
    name: 'better-auth',
    version: '1.7.12',
    peerDependencies: { vitest: '*' },
    peerDependenciesMeta: { vitest: { optional: true }, react: { optional: true } },
  };
  const unrelated = {
    name: 'better-auth',
    version: '1.7.13',
    peerDependencies: { vitest: '*' },
  };

  assert.deepEqual(pnpmfile.hooks.readPackage(target), {
    name: 'better-auth',
    version: '1.7.12',
    peerDependencies: {},
    peerDependenciesMeta: { react: { optional: true } },
  });
  assert.deepEqual(pnpmfile.hooks.readPackage(unrelated), unrelated);
});
