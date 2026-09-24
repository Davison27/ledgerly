import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync as fsRenameSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  compareVersions,
  getRepositoryPaths,
  readJson,
  releaseLocaleKey,
  renderChangelog,
  repositoryRoot,
  validateLocale,
  validateReleaseContract,
  validateReleaseRegistry,
  writeFilesAtomically,
} from './release-contract.mjs';
import {
  calculateNextVersion,
  parseReleaseArguments,
  prepareRelease,
} from './prepare-release.mjs';

const actualPaths = getRepositoryPaths();

const createRepositoryCopy = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ledgerly-release-contract-'));
  const paths = getRepositoryPaths(root);
  mkdirSync(path.dirname(paths.frontManifest), { recursive: true });
  mkdirSync(path.dirname(paths.registry), { recursive: true });
  mkdirSync(path.dirname(paths.englishLocale), { recursive: true });
  for (const filePath of [
    actualPaths.packageManifest,
    actualPaths.frontManifest,
    actualPaths.backManifest,
    actualPaths.registry,
    actualPaths.englishLocale,
    actualPaths.spanishLocale,
    actualPaths.changelog,
  ]) {
    const relativePath = path.relative(repositoryRoot, filePath);
    const destination = path.join(root, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(filePath, destination);
  }
  return paths;
};

test('accepts the stable SemVer grammar and compares numeric components', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9') > 0, true);
  assert.equal(calculateNextVersion('1.1.0', 'major'), '2.0.0');
  assert.equal(calculateNextVersion('1.1.0', 'minor'), '1.2.0');
  assert.equal(calculateNextVersion('1.1.0', 'patch'), '1.1.1');
  assert.throws(() => calculateNextVersion('01.1.0', 'patch'), /stable SemVer/);
});

test('parses the explicit release preparation command', () => {
  assert.deepEqual(parseReleaseArguments(['minor', '2026-10-01']), {
    bump: 'minor',
    date: '2026-10-01',
  });
  assert.deepEqual(parseReleaseArguments(['--bump=patch', '--date', '2026-10-02']), {
    bump: 'patch',
    date: '2026-10-02',
  });
  assert.throws(() => parseReleaseArguments(['patch', '2026-02-30']), /ISO calendar date/);
});

test('verifies the checked-in registry, translations, and generated changelog', () => {
  assert.deepEqual(validateReleaseContract({ root: repositoryRoot }), []);
  const registry = readJson(actualPaths.registry);
  const englishLocale = readJson(actualPaths.englishLocale);
  const rendered = renderChangelog(registry, englishLocale);
  assert.equal(rendered, readFileSync(actualPaths.changelog, 'utf8'));
  assert.equal(releaseLocaleKey('1.1.0'), 'v1_1_0');
});

test('requires one-to-one localized entry coverage', () => {
  const registry = readJson(actualPaths.registry);
  const englishLocale = readJson(actualPaths.englishLocale);
  delete englishLocale.releaseNotes.releases.v1_1_0.entries['release-history'];
  const errors = validateLocale(englishLocale, registry, 'en');
  assert.equal(errors.some((error) => error.includes('release-history')), true);
});

test('prepares one incomplete next release and refuses to overwrite it', () => {
  const paths = createRepositoryCopy();
  const nextVersion = calculateNextVersion(readJson(paths.packageManifest).version, 'patch');
  assert.equal(prepareRelease({ root: paths.root, bump: 'patch', date: '2026-10-01' }), nextVersion);
  assert.equal(readJson(paths.packageManifest).version, nextVersion);
  assert.equal(readJson(paths.frontManifest).version, nextVersion);
  assert.equal(readJson(paths.backManifest).version, nextVersion);
  assert.deepEqual(readJson(paths.registry).releases[0].entries, []);
  assert.throws(
    () => prepareRelease({ root: paths.root, bump: 'patch', date: '2026-10-02' }),
    /incomplete or divergent/,
  );
});

test('rejects empty registry entries when complete data is required', () => {
  const registry = readJson(actualPaths.registry);
  registry.releases[0].entries = [];
  assert.equal(validateReleaseRegistry(registry).some((error) => error.includes('at least one entry')), true);
});

test('rolls back every destination when a later replacement fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ledgerly-release-transaction-'));
  const firstPath = path.join(root, 'first.txt');
  const secondPath = path.join(root, 'second.txt');
  writeFileSync(firstPath, 'first-before');
  writeFileSync(secondPath, 'second-before');

  assert.throws(
    () =>
      writeFilesAtomically(
        [
          [firstPath, 'first-after'],
          [secondPath, 'second-after'],
        ],
        {
          rename: (source, destination) => {
            if (destination === secondPath) throw new Error('forced destination replacement failure');
            fsRenameSync(source, destination);
          },
        },
      ),
    /forced destination replacement failure/,
  );

  assert.equal(readFileSync(firstPath, 'utf8'), 'first-before');
  assert.equal(readFileSync(secondPath, 'utf8'), 'second-before');
  assert.deepEqual(readdirSync(root).sort(), ['first.txt', 'second.txt']);
});
