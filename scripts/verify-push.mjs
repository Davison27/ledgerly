import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  accessSync,
  constants,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { finished } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export const chromiumInstallCommand =
  'pnpm --filter @ledgerly/front exec playwright install chromium';
const nodeTestDirectories = ['scripts', 'scripts/test/e2e', 'deploy/scripts', 'deploy/test/e2e'];

const parseVersion = (value) => {
  const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return undefined;
  return match.slice(1).map(Number);
};

const compareVersions = (left, right) => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
};

export function supportsNodeVersion(version, engineRange) {
  const actual = parseVersion(version);
  if (!actual) return false;

  return engineRange.split('||').some((range) => {
    const match = range.trim().match(/^\^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return false;
    const minimum = match.slice(1).map(Number);
    return actual[0] === minimum[0] && compareVersions(actual, minimum) >= 0;
  });
}

export function createImageTags(runId) {
  if (!/^[a-f0-9]{16,}$/.test(runId))
    throw new Error('The verification run ID must be lowercase hexadecimal.');
  return {
    backend: `ledgerly-verify-push-back:${runId}`,
    frontend: `ledgerly-verify-push-front:${runId}`,
  };
}

const createStep = (name, executable, args, options = {}) => ({
  name,
  executable,
  args,
  ...options,
});

export function discoverNodeTestFiles(root = repositoryRoot) {
  const files = [];

  for (const directory of nodeTestDirectories) {
    const absoluteDirectory = path.join(root, directory);
    if (!existsSync(absoluteDirectory)) {
      throw new Error(`Required local Node test directory is missing: ${directory}`);
    }

    const tests = readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
      .map((entry) => path.posix.join(directory, entry.name))
      .sort();

    if (tests.length === 0) {
      throw new Error(`No local Node tests were discovered in ${directory}`);
    }
    files.push(...tests);
  }

  return files;
}

export function buildVerificationSteps(images, nodeTestFiles) {
  if (!Array.isArray(nodeTestFiles) || nodeTestFiles.length === 0) {
    throw new Error('At least one local Node test file is required.');
  }

  const testEnvironment = {
    LEDGERLY_E2E_BACK_IMAGE: images.backend,
    LEDGERLY_E2E_FRONT_IMAGE: images.frontend,
  };

  return [
    createStep('Run local Node regression tests', process.execPath, ['--test', ...nodeTestFiles]),
    createStep('Run uncached unit tests', 'pnpm', [
      'exec',
      'turbo',
      'run',
      'test',
      '--force',
      '--concurrency=1',
    ]),
    createStep('Run backend integration tests', 'pnpm', [
      '--filter',
      '@ledgerly/back',
      'test:integration',
    ]),
    createStep('Run backend HTTP E2E tests', 'pnpm', [
      '--filter',
      '@ledgerly/back',
      'test:e2e:http',
    ]),
    createStep('Build host production artifacts', 'pnpm', [
      'exec',
      'turbo',
      'run',
      'build',
      '--force',
      '--concurrency=1',
    ]),
    createStep(
      'Build production backend test image',
      'docker',
      ['build', '--file', 'apps/back/Dockerfile', '--tag', images.backend, '.'],
      { imageTag: images.backend },
    ),
    createStep(
      'Build production frontend test image',
      'docker',
      ['build', '--file', 'apps/front/Dockerfile', '--tag', images.frontend, '.'],
      { imageTag: images.frontend },
    ),
    createStep(
      'Run isolated database E2E tests',
      'pnpm',
      ['--filter', '@ledgerly/back', 'test:e2e:database'],
      {
        environment: testEnvironment,
      },
    ),
    createStep(
      'Run the production upgrade rehearsal',
      'pnpm',
      ['--filter', '@ledgerly/back', 'test:e2e:upgrade'],
      {
        environment: testEnvironment,
      },
    ),
    createStep(
      'Run Playwright browser E2E tests',
      'pnpm',
      ['--filter', '@ledgerly/front', 'test:e2e'],
      {
        environment: testEnvironment,
      },
    ),
    createStep('Typecheck Playwright E2E tests', 'pnpm', [
      '--filter',
      '@ledgerly/front',
      'test:e2e:typecheck',
    ]),
    createStep('Typecheck the workspace', 'pnpm', ['typecheck']),
    createStep('Run uncached lint', 'pnpm', [
      'exec',
      'turbo',
      'run',
      'lint',
      '--force',
      '--concurrency=1',
    ]),
    createStep('Run repository and release checks', 'pnpm', ['check:repo']),
  ];
}

export async function runSteps(steps, execute) {
  for (const [index, step] of steps.entries()) await execute(step, index);
}

export function createSignalLifecycle(signalTarget = process) {
  const controller = new AbortController();
  let signalName;
  const handlers = new Map();

  for (const name of ['SIGINT', 'SIGTERM']) {
    const handler = () => {
      if (controller.signal.aborted) return;
      signalName = name;
      controller.abort(name);
    };
    handlers.set(name, handler);
    signalTarget.once(name, handler);
  }

  return {
    signal: controller.signal,
    get signalName() {
      return signalName;
    },
    dispose() {
      for (const [name, handler] of handlers) signalTarget.removeListener(name, handler);
    },
  };
}

function runProbe(executable, args, cwd) {
  try {
    return execFileSync(executable, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    }).trim();
  } catch (error) {
    const detail = String(error.stderr ?? error.message ?? '').trim();
    const status = error.code === 'ETIMEDOUT' ? 'timed out after 30 seconds' : 'failed';
    throw new Error(`${executable} ${args.join(' ')} ${status}${detail ? `: ${detail}` : '.'}`);
  }
}

function verifyWorkspaceDependencies(root) {
  if (existsSync(path.join(root, 'node_modules/.modules.yaml'))) return;
  throw new Error(
    'Workspace dependencies are missing. Run `pnpm install --frozen-lockfile` before pushing.',
  );
}

function verifyPlaywrightChromium(root) {
  const requireFrontend = createRequire(path.join(root, 'apps/front/package.json'));
  let chromium;
  try {
    ({ chromium } = requireFrontend('@playwright/test'));
  } catch {
    throw new Error(
      'Playwright dependencies are missing. Run `pnpm install --frozen-lockfile` before pushing.',
    );
  }

  try {
    accessSync(chromium.executablePath(), constants.X_OK);
  } catch {
    throw new Error(
      `Playwright Chromium is not installed for the local test dependencies. Run ${chromiumInstallCommand} once, then retry.`,
    );
  }
}

async function verifyDocker() {
  const { assertLocalDocker } = await import('./test/e2e/isolated-stack.mjs');
  await assertLocalDocker();
}

export async function preflight(root = repositoryRoot) {
  const packageManifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const problems = [];

  if (!supportsNodeVersion(process.version, packageManifest.engines?.node ?? '')) {
    problems.push(
      `Node ${process.version} is outside the supported range ${packageManifest.engines?.node ?? '(missing)'}.`,
    );
  }

  const packageManagerVersion = packageManifest.packageManager?.match(/^pnpm@(.+)$/)?.[1];
  if (!packageManagerVersion) {
    problems.push('The root package manifest must pin pnpm with its packageManager field.');
  } else {
    try {
      const actualPnpmVersion = runProbe('pnpm', ['--version'], root);
      if (actualPnpmVersion !== packageManagerVersion) {
        problems.push(
          `pnpm ${actualPnpmVersion} is installed; this repository requires pnpm ${packageManagerVersion}.`,
        );
      }
    } catch (error) {
      problems.push(error.message);
    }
  }

  try {
    verifyWorkspaceDependencies(root);
  } catch (error) {
    problems.push(error.message);
  }

  try {
    verifyPlaywrightChromium(root);
  } catch (error) {
    problems.push(error.message);
  }

  try {
    await verifyDocker();
  } catch (error) {
    problems.push(`Local Docker Compose is unavailable or uses a remote context: ${error.message}`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Local verification prerequisites are not satisfied:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
    );
  }
}

function createLogName(index, name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${String(index + 1).padStart(2, '0')}-${slug}.log`;
}

export async function executeStep(step, index, artifactDirectory, root, signal) {
  if (signal?.aborted) throw new Error(`${step.name} was interrupted by ${signal.reason}.`);

  const logPath = path.join(artifactDirectory, createLogName(index, step.name));
  const output = createWriteStream(logPath, { flags: 'wx', mode: 0o600 });
  await new Promise((resolve, reject) => {
    output.once('open', resolve);
    output.once('error', reject);
  });

  process.stdout.write(`\n[verify:push] ${step.name}\n`);
  const child = spawn(step.executable, step.args, {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, ...step.environment },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let childClosed = false;

  const terminate = () => {
    if (childClosed) return;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else if (child.pid) process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') {
        process.stderr.write(`[verify:push] Unable to stop ${step.name}: ${error.message}\n`);
      }
    }
  };

  signal?.addEventListener('abort', terminate, { once: true });
  if (signal?.aborted) terminate();

  const forward = (source, destination) => {
    source.on('data', (chunk) => {
      destination.write(chunk);
      output.write(chunk);
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  const result = await new Promise((resolve) => {
    let spawnError;
    child.once('error', (error) => {
      spawnError = error;
    });
    child.once('close', (code, terminationSignal) => {
      childClosed = true;
      resolve({ code, terminationSignal, spawnError });
    });
  });
  signal?.removeEventListener('abort', terminate);

  output.end();
  await finished(output);

  if (result.spawnError) {
    throw new Error(`${step.name} could not start: ${result.spawnError.message}. Log: ${logPath}`);
  }
  if (result.code !== 0) {
    const status = result.terminationSignal
      ? `signal ${result.terminationSignal}`
      : `exit code ${result.code}`;
    throw new Error(`${step.name} failed with ${status}. Log: ${logPath}`);
  }
  if (step.imageTag) process.stdout.write(`[verify:push] Built local image ${step.imageTag}\n`);
}

async function removeOwnedImage(imageTag, index, artifactDirectory, root) {
  try {
    runProbe('docker', ['image', 'inspect', '--format', '{{.Id}}', imageTag], root);
  } catch (error) {
    if (/no such (?:image|object)|not found/i.test(error.message)) return;
    throw error;
  }

  await executeStep(
    createStep(`Remove local test image ${imageTag}`, 'docker', ['image', 'rm', imageTag]),
    100 + index,
    artifactDirectory,
    root,
  );
}

async function runVerification() {
  const runId = randomBytes(12).toString('hex');
  const images = createImageTags(runId);
  const nodeTestFiles = discoverNodeTestFiles();
  await preflight();

  const artifactDirectory = path.join(repositoryRoot, '.artifacts/verify-push', `run-${runId}`);
  mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });

  const signalLifecycle = createSignalLifecycle();
  const attemptedImages = new Set();
  let failure;

  try {
    await runSteps(buildVerificationSteps(images, nodeTestFiles), async (step, index) => {
      if (step.imageTag) attemptedImages.add(step.imageTag);
      await executeStep(step, index, artifactDirectory, repositoryRoot, signalLifecycle.signal);
    });
  } catch (error) {
    failure = signalLifecycle.signal.aborted
      ? new Error(`Verification interrupted by ${signalLifecycle.signalName}.`)
      : error;
  }

  for (const [index, imageTag] of attemptedImages.entries()) {
    try {
      await removeOwnedImage(imageTag, index, artifactDirectory, repositoryRoot);
    } catch (error) {
      failure ??= error;
    }
  }

  if (!failure && signalLifecycle.signal.aborted) {
    failure = new Error(`Verification interrupted by ${signalLifecycle.signalName}.`);
  }
  signalLifecycle.dispose();

  if (failure) {
    const error = new Error(
      `${failure.message}\nVerification logs retained at ${artifactDirectory}`,
    );
    if (signalLifecycle.signalName) {
      error.exitCode = signalLifecycle.signalName === 'SIGINT' ? 130 : 143;
    }
    throw error;
  }

  rmSync(artifactDirectory, { recursive: true, force: true });
  process.stdout.write('\n[verify:push] All local verification steps passed.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runVerification();
  } catch (error) {
    process.stderr.write(`[verify:push] ${error.message}\n`);
    process.exitCode = error.exitCode ?? 1;
  }
}
