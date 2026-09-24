import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const containerName = 'ledgerly-postgres';
const databaseName = 'ledgerly_migration_test';
const databaseUser = process.env.DB_USER ?? 'ledgerly';
const databasePassword = process.env.DB_PASSWORD ?? 'ledgerly';
const databasePort = process.env.DB_PORT ?? '5432';
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const testConfigs = new Set(['./test/jest-e2e.json', './test/jest-e2e-database.json']);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function docker(args) {
  return execFileSync('docker', args, {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function ensureMigrationTestDatabase() {
  docker(['compose', 'up', '-d', 'postgres']);

  const image = docker(['inspect', '--format', '{{.Config.Image}}', containerName]);
  if (!image.startsWith('postgres:')) {
    throw new Error(`The container ${containerName} is not a PostgreSQL development container.`);
  }

  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      docker(['exec', containerName, 'pg_isready', '-U', databaseUser, '-d', 'postgres']);
      ready = true;
      break;
    } catch {
      await delay(1000);
    }
  }

  if (!ready) {
    throw new Error(`The PostgreSQL container ${containerName} did not become ready.`);
  }

  const exists = docker([
    'exec',
    containerName,
    'psql',
    '-U',
    databaseUser,
    '-d',
    'postgres',
    '-tAc',
    `SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`,
  ]);

  if (exists !== '1') {
    docker(['exec', containerName, 'createdb', '-U', databaseUser, databaseName]);
  }

  const migrationTestUrl = new URL(`postgresql://localhost:${databasePort}/${databaseName}`);
  migrationTestUrl.username = databaseUser;
  migrationTestUrl.password = databasePassword;
  return migrationTestUrl.toString();
}

function runJest(config, migrationTestUrl) {
  execFileSync(process.execPath, [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    '--config',
    config,
    '--runInBand',
  ], {
    cwd: packageRoot,
    env: { ...process.env, LEDGERLY_MIGRATION_TEST_URL: migrationTestUrl },
    stdio: 'inherit',
  });
}

async function run() {
  const config = process.argv[2] ?? './test/jest-e2e-database.json';
  if (!testConfigs.has(config)) throw new Error(`Unsupported E2E test config: ${config}`);

  const migrationTestUrl = process.env.LEDGERLY_MIGRATION_TEST_URL || await ensureMigrationTestDatabase();
  runJest(config, migrationTestUrl);
}

run().catch((error) => {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';
  fail(stderr || (error instanceof Error ? error.message : 'Unable to run the PostgreSQL E2E suite.'));
});
