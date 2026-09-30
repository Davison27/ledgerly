import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const scriptPath = fileURLToPath(new URL('./ensure-development-env.mjs', import.meta.url));
const examplePath = path.join(repositoryRoot, 'apps/back/.env.example');
const execFileAsync = promisify(execFile);

const createRepositoryCopy = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ledgerly-development-env-'));
  mkdirSync(path.join(root, 'scripts'));
  mkdirSync(path.join(root, 'apps/back'), { recursive: true });
  copyFileSync(scriptPath, path.join(root, 'scripts/ensure-development-env.mjs'));
  copyFileSync(examplePath, path.join(root, 'apps/back/.env.example'));
  return root;
};

const runHelper = (root, fromBack = false) =>
  execFileSync(
    process.execPath,
    [fromBack ? '../../scripts/ensure-development-env.mjs' : 'scripts/ensure-development-env.mjs'],
    { cwd: fromBack ? path.join(root, 'apps/back') : root, encoding: 'utf8' },
  );

test('creates one private stable environment from both supported working directories', () => {
  const root = createRepositoryCopy();
  const environmentPath = path.join(root, 'apps/back/.env');

  try {
    const output = runHelper(root, true);
    const environment = readFileSync(environmentPath, 'utf8');
    const password = environment.match(/^DB_PASSWORD=(.*)$/m)?.[1];

    assert.match(password, /^[a-f0-9]{64}$/);
    assert.equal(statSync(environmentPath).mode & 0o777, 0o600);
    assert.equal(
      environment,
      readFileSync(path.join(root, 'apps/back/.env.example'), 'utf8').replace(
        /^DB_PASSWORD=.*$/m,
        `DB_PASSWORD=${password}`,
      ),
    );
    assert.equal(output.includes(password), false);
    assert.equal(runHelper(root), '');
    assert.equal(readFileSync(environmentPath, 'utf8'), environment);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('leaves an existing environment file and its permissions unchanged', () => {
  const root = createRepositoryCopy();
  const environmentPath = path.join(root, 'apps/back/.env');
  const existing = Buffer.from('DB_PASSWORD=existing-volume-password\nCUSTOM_SETTING=keep\n');

  try {
    writeFileSync(environmentPath, existing, { mode: 0o640 });
    const mode = statSync(environmentPath).mode & 0o777;
    const output = runHelper(root);

    assert.deepEqual(readFileSync(environmentPath), existing);
    assert.equal(statSync(environmentPath).mode & 0o777, mode);
    assert.equal(output.includes('existing-volume-password'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('publishes one complete private environment when first-run calls race', async () => {
  const root = createRepositoryCopy();
  const environmentDirectory = path.join(root, 'apps/back');
  const environmentPath = path.join(environmentDirectory, '.env');

  try {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        execFileAsync(
          process.execPath,
          ['scripts/ensure-development-env.mjs'],
          { cwd: root, encoding: 'utf8' },
        ),
      ),
    );
    const environment = readFileSync(environmentPath, 'utf8');
    const password = environment.match(/^DB_PASSWORD=(.*)$/m)?.[1];

    assert.match(password, /^[a-f0-9]{64}$/);
    assert.equal(statSync(environmentPath).mode & 0o777, 0o600);
    assert.equal(
      environment,
      readFileSync(path.join(environmentDirectory, '.env.example'), 'utf8').replace(
        /^DB_PASSWORD=.*$/m,
        `DB_PASSWORD=${password}`,
      ),
    );
    assert.equal(results.filter(({ stdout }) => stdout.length > 0).length, 1);
    assert.deepEqual(
      readdirSync(environmentDirectory).filter((name) => name.startsWith('.env.') && name.endsWith('.tmp')),
      [],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('prepares development environments before Make starts Compose', () => {
  for (const target of ['up', 'dev']) {
    const output = execFileSync('make', ['-n', target], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    });
    const helperIndex = output.indexOf('node scripts/ensure-development-env.mjs');
    const composeIndex = output.indexOf('docker compose --project-name ledgerly-dev');

    assert.notEqual(helperIndex, -1, `${target} must invoke the helper`);
    assert.ok(composeIndex > helperIndex, `${target} must invoke Compose after the helper`);
  }

  const backScripts = JSON.parse(readFileSync(path.join(repositoryRoot, 'apps/back/package.json'), 'utf8')).scripts;
  assert.match(
    backScripts['db:up'],
    /^node \.\.\/\.\.\/scripts\/ensure-development-env\.mjs && docker compose up -d$/,
  );

  const migrationTestScripts = Object.entries(backScripts).filter(([, command]) =>
    command.includes('run-migration-test-e2e.mjs'),
  );
  assert.ok(migrationTestScripts.length > 0);
  for (const [name, command] of migrationTestScripts) {
    assert.match(
      command,
      /^node \.\.\/\.\.\/scripts\/ensure-development-env\.mjs && node scripts\/run-migration-test-e2e\.mjs(?: |$)/,
      `${name} must create the development environment before the migration E2E runner`,
    );
  }
});
