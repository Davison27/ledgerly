import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withIsolatedStack } from '../../../scripts/test/e2e/isolated-stack.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const testConfigs = new Set(['./test/jest-e2e.json', './test/jest-e2e-database.json']);

function runJest(config, environment, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--no-compilation-cache',
        '--experimental-vm-modules',
        'node_modules/jest/bin/jest.js',
        '--config',
        config,
        '--runInBand',
      ],
      {
        cwd: packageRoot,
        env: environment,
        signal,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('close', (code, terminationSignal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Jest exited with status ${code ?? terminationSignal}.`));
    });
  });
}

async function run() {
  const config = process.argv[2] ?? './test/jest-e2e-database.json';
  if (!testConfigs.has(config)) throw new Error(`Unsupported E2E test config: ${config}`);

  await withIsolatedStack({ services: ['postgres'] }, async (stack, { signal }) => {
    await stack.up();
    await runJest(config, stack.environment, signal);
  });
}

run().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Unable to run the PostgreSQL E2E suite.'}\n`,
  );
  if (process.exitCode === 0 || process.exitCode === undefined) process.exitCode = 1;
});
