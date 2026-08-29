import { execFileSync } from 'node:child_process';
import 'dotenv/config';

const containerName = 'ledgerly-postgres';
const databaseName = 'ledgerly_migration_test';
const databaseUser = process.env.DB_USER ?? 'ledgerly';
const databasePassword = process.env.DB_PASSWORD ?? 'ledgerly';
const databasePort = process.env.DB_PORT ?? '5432';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function docker(args) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run() {
  let image;
  try {
    image = docker(['inspect', '--format', '{{.Config.Image}}', containerName]);
  } catch {
    fail(`The local PostgreSQL container ${containerName} is unavailable. Start it with pnpm db:up.`);
    return;
  }

  if (!image.startsWith('postgres:')) {
    fail(`The container ${containerName} is not a PostgreSQL development container.`);
    return;
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

  execFileSync('pnpm', ['run', 'test:e2e:database'], {
    env: { ...process.env, LEDGERLY_MIGRATION_TEST_URL: migrationTestUrl.toString() },
    stdio: 'inherit',
  });
}

try {
  run();
} catch (error) {
  fail(error instanceof Error ? error.message : 'Unable to run the PostgreSQL E2E suite.');
}
