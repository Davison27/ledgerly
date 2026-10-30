import { randomBytes, timingSafeEqual, X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withIsolatedStack } from '../../../../scripts/test/e2e/isolated-stack.mjs';

const frontRoot = fileURLToPath(new URL('../../', import.meta.url));
const frontManifest = new URL('../../package.json', import.meta.url);
const releaseRegistry = new URL(
  '../../src/entities/release-note/config/release-notes.json',
  import.meta.url,
);
const fixtureMarker = 'LEDGERLY_PLAYWRIGHT_FIXTURE:';
const TEST_CLIENT_ADDRESS_PATTERN =
  /^198\.18\.(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])\.(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])$/;
const actorNames = ['admin', 'readonly', 'restricted', 'staffProfileOnly'];
const configuredIdNames = [
  'clientId',
  'projectId',
  'staffMemberId',
  'supplierId',
  'equipmentId',
  'templateId',
  'notificationId',
  'extractionHintId',
];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readCurrentReleaseVersion() {
  const registry = JSON.parse(await readFile(releaseRegistry, 'utf8'));
  if (
    typeof registry.currentVersion !== 'string' ||
    !Array.isArray(registry.releases) ||
    !registry.releases.some((release) => release?.version === registry.currentVersion)
  ) {
    throw new Error('The frontend release registry has no valid current release.');
  }
  return registry.currentVersion;
}

function validateCookie(cookie) {
  const keys = ['httpOnly', 'name', 'path', 'sameSite', 'secure', 'value'];
  if (
    !isRecord(cookie) ||
    Object.keys(cookie).sort().join(',') !== keys.join(',') ||
    !/^(?:__Secure-)?ledgerly\.session_token$/.test(cookie.name) ||
    typeof cookie.value !== 'string' ||
    cookie.value.length < 32 ||
    cookie.path !== '/' ||
    cookie.httpOnly !== true ||
    cookie.secure !== true ||
    cookie.sameSite !== 'Lax'
  ) {
    throw new Error('The Playwright fixture returned an invalid production session cookie.');
  }
}

function validateFixtureResult(result, scenario, releaseVersion, bootstrapEmail) {
  const keys = ['actors', 'bootstrapEmail', 'currentReleaseVersion', 'ids', 'infectedMarker'];
  if (!isRecord(result) || Object.keys(result).sort().join(',') !== keys.join(',')) {
    throw new Error('The Playwright fixture returned an unexpected result shape.');
  }
  if (
    result.bootstrapEmail !== bootstrapEmail ||
    result.currentReleaseVersion !== releaseVersion ||
    typeof result.infectedMarker !== 'string' ||
    result.infectedMarker.length < 8 ||
    !isRecord(result.ids) ||
    !isRecord(result.actors)
  ) {
    throw new Error('The Playwright fixture returned invalid synthetic application data.');
  }

  const allowedActors = new Set(actorNames);
  if (Object.keys(result.actors).some((actor) => !allowedActors.has(actor))) {
    throw new Error('The Playwright fixture returned an unsupported actor.');
  }
  for (const cookie of Object.values(result.actors)) validateCookie(cookie);

  if (scenario === 'configured') {
    if (
      configuredIdNames.some((name) => typeof result.ids[name] !== 'string' || !result.ids[name]) ||
      actorNames.some((actor) => !result.actors[actor])
    ) {
      throw new Error(
        'The configured Playwright fixture is missing persisted records or actor sessions.',
      );
    }
  } else if (Object.keys(result.ids).length > 0) {
    throw new Error(
      'Fresh and onboarding Playwright fixtures must not expose configured record IDs.',
    );
  }

  if (scenario === 'fresh' && Object.keys(result.actors).length > 0) {
    throw new Error('The fresh Playwright fixture must not create authenticated actors.');
  }
  if (scenario === 'onboarding' && !result.actors.admin) {
    throw new Error('The onboarding Playwright fixture requires the founder session.');
  }
  return result;
}

function readRequestBody(request, limit = 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    request.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.once('error', reject);
  });
}

function sendJson(response, statusCode, value) {
  if (response.destroyed) return;
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function tokenMatches(candidate, expected) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

async function handleResetRequest(
  request,
  response,
  { stack, token, releaseVersion, localCa, signal },
) {
  if (request.socket.remoteAddress !== '127.0.0.1') {
    sendJson(response, 403, { error: 'loopback-only' });
    return;
  }
  if (request.url !== '/reset') {
    sendJson(response, 404, { error: 'not-found' });
    return;
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method-not-allowed' });
    return;
  }
  const authorization = request.headers.authorization ?? '';
  const presentedToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!tokenMatches(presentedToken, token)) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }
  if (
    request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json'
  ) {
    sendJson(response, 415, { error: 'unsupported-media-type' });
    return;
  }

  let input;
  try {
    input = JSON.parse(await readRequestBody(request));
  } catch (error) {
    const statusCode = error?.statusCode === 413 ? 413 : 400;
    sendJson(response, statusCode, { error: 'invalid-request' });
    return;
  }
  const inputKeys = ['acknowledgeRelease', 'scenario', 'testClientAddress'];
  if (
    !isRecord(input) ||
    Object.keys(input).sort().join(',') !== inputKeys.join(',') ||
    !['fresh', 'onboarding', 'configured'].includes(input.scenario) ||
    typeof input.acknowledgeRelease !== 'boolean' ||
    typeof input.testClientAddress !== 'string' ||
    !TEST_CLIENT_ADDRESS_PATTERN.test(input.testClientAddress)
  ) {
    sendJson(response, 400, { error: 'invalid-request' });
    return;
  }

  try {
    const encodedInput = Buffer.from(
      JSON.stringify({
        ...input,
        currentReleaseVersion: releaseVersion,
        origin: stack.origin,
      }),
      'utf8',
    ).toString('base64url');
    const caBase64 = Buffer.from(localCa, 'utf8').toString('base64');
    const output = await stack.run(
      'fixture',
      ['/fixture/playwright-fixture.mjs', 'reset', encodedInput, caBase64],
      { signal },
    );
    const lines = output.split(/\r?\n/).filter((line) => line.startsWith(fixtureMarker));
    if (lines.length !== 1) throw new Error('The fixture result marker is missing or duplicated.');
    const fixture = validateFixtureResult(
      JSON.parse(lines[0].slice(fixtureMarker.length)),
      input.scenario,
      releaseVersion,
      stack.environment.BOOTSTRAP_ADMIN_EMAIL,
    );
    sendJson(response, 200, { ...fixture, origin: stack.origin });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Playwright fixture reset failed: ${reason}\n`);
    sendJson(response, 500, { error: 'fixture-reset-failed' });
  }
}

export async function openControlBridge(stack, token, releaseVersion, localCa, signal) {
  const server = createServer((request, response) => {
    void handleResetRequest(request, response, {
      stack,
      token,
      releaseVersion,
      localCa,
      signal,
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Unable to bind the local fixture bridge.');
  return { server, url: `http://127.0.0.1:${address.port}` };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runChild(executable, args, options, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      ...options,
      stdio: 'inherit',
    });
    let killTimer;
    const stopChild = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }, 10_000);
      killTimer.unref();
    };
    signal.addEventListener('abort', stopChild, { once: true });
    if (signal.aborted) stopChild();
    child.once('error', (error) => {
      clearTimeout(killTimer);
      signal.removeEventListener('abort', stopChild);
      reject(error);
    });
    child.once('exit', (code, childSignal) => {
      clearTimeout(killTimer);
      signal.removeEventListener('abort', stopChild);
      resolve(code ?? (childSignal ? 1 : 0));
    });
  });
}

function validateLocalCa(pem) {
  if (
    typeof pem !== 'string' ||
    !/^-----BEGIN CERTIFICATE-----\n[\s\S]+\n-----END CERTIFICATE-----\s*$/.test(pem)
  ) {
    throw new Error('The isolated HTTPS proxy did not provide a valid local CA certificate.');
  }
  const certificate = new X509Certificate(pem);
  if (!certificate.ca || !certificate.verify(certificate.publicKey)) {
    throw new Error('The isolated HTTPS proxy CA is not a valid self-signed CA certificate.');
  }
  return pem;
}

async function writeLocalCa(pem) {
  const directory = await mkdtemp(join(tmpdir(), 'ledgerly-playwright-ca-'));
  const certificatePath = join(directory, 'root-ca.pem');
  try {
    await writeFile(certificatePath, pem, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return { directory, certificatePath };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export function createPlaywrightEnvironment({ bridgeUrl, bridgeToken, caPath }) {
  const environment = {};
  for (const name of [
    'PATH',
    'HOME',
    'TMPDIR',
    'TMP',
    'TEMP',
    'LANG',
    'LC_ALL',
    'CI',
    'FORCE_COLOR',
    'PLAYWRIGHT_BROWSERS_PATH',
  ]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  environment.NODE_EXTRA_CA_CERTS = caPath;
  environment.LEDGERLY_E2E_CONTROL_URL = bridgeUrl;
  environment.LEDGERLY_E2E_CONTROL_TOKEN = bridgeToken;
  return environment;
}

export async function runPlaywright() {
  const releaseVersion = await readCurrentReleaseVersion();
  const runName = randomBytes(6).toString('hex');
  const capability = randomBytes(32).toString('base64url');
  const backendImage = process.env.LEDGERLY_E2E_BACK_IMAGE;
  const frontendImage = process.env.LEDGERLY_E2E_FRONT_IMAGE;
  if (
    !backendImage ||
    !frontendImage ||
    backendImage.endsWith(':missing') ||
    frontendImage.endsWith(':missing')
  ) {
    throw new Error('Build local production test images first by running `pnpm verify:push`.');
  }

  const requireFrontend = createRequire(frontManifest);
  const playwrightCli = requireFrontend.resolve('@playwright/test/cli');
  return withIsolatedStack(
    {
      databaseName: `ledgerly_e2e_${runName}`,
      services: ['postgres', 'clamav'],
      profiles: ['application', 'malware'],
    },
    async (stack, { signal }) => {
      await stack.up({ signal });
      await stack.run('migrator', ['--mode=auto'], { signal });
      await stack.up({
        services: ['back', 'front', 'proxy'],
        profiles: ['application', 'malware'],
        signal,
      });
      const localCaPem = validateLocalCa(
        await stack.exec('proxy', ['cat', '/data/caddy/pki/authorities/local/root.crt'], {
          signal,
        }),
      );
      const localCa = await writeLocalCa(localCaPem);
      let bridge;
      try {
        bridge = await openControlBridge(stack, capability, releaseVersion, localCaPem, signal);
        return await runChild(
          process.execPath,
          [playwrightCli, 'test'],
          {
            cwd: frontRoot,
            env: createPlaywrightEnvironment({
              bridgeUrl: bridge.url,
              bridgeToken: capability,
              caPath: localCa.certificatePath,
            }),
          },
          signal,
        );
      } finally {
        try {
          if (bridge) await closeServer(bridge.server);
        } finally {
          await rm(localCa.directory, { recursive: true, force: true });
        }
      }
    },
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPlaywright()
    .then((exitCode) => {
      if (exitCode !== 0 && process.exitCode !== 130 && process.exitCode !== 143) {
        process.exitCode = exitCode;
      }
    })
    .catch((error) => {
      process.stderr.write(
        `Unable to run local Playwright verification: ${error instanceof Error ? error.message : 'unknown error'}\n`,
      );
      process.exitCode = 1;
    });
}
