import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const composeFile = join(repositoryRoot, 'deploy/test/e2e.compose.yml');
const composeDirectory = join(repositoryRoot, 'deploy/test');
const projectLabel = 'com.docker.compose.project';
const ownerLabel = 'com.ledgerly.e2e.owner';
const ownedProjectLabel = 'com.ledgerly.e2e.project';
const allowedServices = new Set([
  'postgres',
  'clamav',
  'back',
  'front',
  'proxy',
  'migrator',
  'fixture',
]);
const applicationServices = new Set(['back', 'front', 'proxy', 'migrator', 'fixture']);
const longRunningServices = new Set(['postgres', 'clamav', 'back', 'front', 'proxy']);
const serviceProfiles = new Map([
  ['clamav', 'malware'],
  ...[...applicationServices].map((service) => [service, 'application']),
]);
const allowedProfiles = new Set(['malware', 'application']);
const databaseEnvironmentKeys = new Set([
  'DATABASE_URL',
  'DATABASE_URI',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DB_URL',
  'POSTGRES_URL',
  'POSTGRESQL_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'TYPEORM_URL',
  'LEDGERLY_MIGRATION_TEST_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'PGHOST',
  'PGHOSTADDR',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
  'PGSERVICE',
  'PGSERVICEFILE',
]);

function dockerEnvironment(source = process.env) {
  const environment = {};
  for (const name of [
    'PATH',
    'HOME',
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
    'DOCKER_CONFIG',
    'DOCKER_API_VERSION',
  ]) {
    if (source[name]) environment[name] = source[name];
  }
  return environment;
}

function testEnvironment(source) {
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
  ]) {
    if (source[name]) environment[name] = source[name];
  }
  return environment;
}

function assertLocalEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error('Docker must use a local Unix socket, named pipe, or loopback TCP endpoint.');
  }
  if (endpoint.startsWith('unix://') || endpoint.startsWith('npipe://')) return;

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('Docker must use a local Unix socket, named pipe, or loopback TCP endpoint.');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const loopback =
    host === 'localhost' || host === '::1' || (isIP(host) === 4 && host.startsWith('127.'));
  if (parsed.protocol !== 'tcp:' || !loopback) {
    throw new Error(`Refusing non-local Docker endpoint: ${endpoint}`);
  }
}

function runProcess(command, args, { cwd = repositoryRoot, env = process.env, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, signal, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (code, terminationSignal) => {
      const output = Buffer.concat(stdout).toString('utf8').trim();
      const errorOutput = Buffer.concat(stderr).toString('utf8').trim();
      if (code === 0) {
        resolve(output);
        return;
      }
      const error = new Error(
        errorOutput || `${command} exited with status ${code ?? terminationSignal}.`,
      );
      error.code = code;
      error.signal = terminationSignal;
      reject(error);
    });
  });
}

function validateDatabaseName(databaseName) {
  if (typeof databaseName !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) {
    throw new Error('The isolated PostgreSQL database name must be a lowercase identifier.');
  }
}

function assertNoExternalDatabase(source) {
  const supplied = [...databaseEnvironmentKeys].filter((name) => source[name]);
  if (supplied.length) {
    throw new Error(
      `Unset external database settings before running isolated E2E tests: ${supplied.join(', ')}`,
    );
  }
}

function assertRequestedResources(services, profiles) {
  if (
    !Array.isArray(services) ||
    services.length === 0 ||
    services.some((service) => !allowedServices.has(service))
  ) {
    throw new Error('The isolated E2E stack accepts only its declared services.');
  }
  if (!Array.isArray(profiles) || profiles.some((profile) => !allowedProfiles.has(profile))) {
    throw new Error('The isolated E2E stack accepts only its declared profiles.');
  }
  for (const service of services) {
    const requiredProfile = serviceProfiles.get(service);
    if (requiredProfile && !profiles.includes(requiredProfile)) {
      throw new Error(`The isolated ${service} service requires the ${requiredProfile} profile.`);
    }
  }
}

function assertComposeConfiguration(
  configuration,
  projectName,
  databasePort,
  proxyPort,
  environment,
) {
  const services = configuration.services ?? {};
  const postgres = services.postgres;
  const networks = configuration.networks ?? {};
  const internalNetwork = networks.default;
  const hostAccessNetwork = networks['host-access'];
  if (
    !postgres ||
    !internalNetwork ||
    !hostAccessNetwork ||
    Object.keys(services).some((service) => !allowedServices.has(service)) ||
    [...allowedServices].some((service) => !services[service]) ||
    Object.keys(configuration.volumes ?? {}).length > 0 ||
    Object.keys(networks).length !== 2 ||
    Object.keys(networks).some((name) => !['default', 'host-access'].includes(name))
  ) {
    throw new Error(
      'The isolated Compose file must define only its declared services and networks.',
    );
  }
  if (postgres.container_name || postgres.volumes || postgres.network_mode) {
    throw new Error(
      'The isolated PostgreSQL service cannot set a fixed container, mount, or network.',
    );
  }
  const port = postgres.ports?.[0];
  if (
    postgres.ports?.length !== 1 ||
    port.host_ip !== '127.0.0.1' ||
    Number(port.target) !== 5432 ||
    Number(port.published) !== databasePort
  ) {
    throw new Error('PostgreSQL must publish only an ephemeral port on 127.0.0.1.');
  }
  const proxy = services.proxy;
  const proxyPortBinding = proxy.ports?.[0];
  if (
    proxy.ports?.length !== 1 ||
    proxyPortBinding.host_ip !== '127.0.0.1' ||
    Number(proxyPortBinding.target) !== 443 ||
    Number(proxyPortBinding.published) !== proxyPort
  ) {
    throw new Error('The isolated HTTPS proxy must publish only an ephemeral port on 127.0.0.1.');
  }
  if (
    environment.E2E_GOOGLE_CLIENT_ID !==
      `e2e-${projectName.slice(-12)}.apps.googleusercontent.com` ||
    !/^[A-Za-z0-9_-]{40,}$/.test(environment.E2E_GOOGLE_CLIENT_SECRET ?? '')
  ) {
    throw new Error('The isolated application must use generated local Google credentials.');
  }
  if (
    internalNetwork.internal !== true ||
    internalNetwork.external === true ||
    hostAccessNetwork.driver !== 'bridge' ||
    hostAccessNetwork.internal === true ||
    hostAccessNetwork.external === true
  ) {
    throw new Error(
      'The isolated E2E networks must be Compose-owned internal and bridge networks.',
    );
  }
  for (const [name, service] of Object.entries(services)) {
    const labels = service.labels ?? {};
    const serviceNetworks = Object.keys(service.networks ?? {}).sort();
    const expectedNetworks = ['postgres', 'proxy'].includes(name)
      ? ['default', 'host-access']
      : ['default'];
    if (
      labels[ownerLabel] !== 'isolated-stack' ||
      labels[ownedProjectLabel] !== projectName ||
      service.network_mode ||
      serviceNetworks.length !== expectedNetworks.length ||
      serviceNetworks.some((networkName, index) => networkName !== expectedNetworks[index])
    ) {
      throw new Error('Every isolated E2E service must carry the generated ownership labels.');
    }
  }
  for (const network of Object.values(networks)) {
    const labels = network.labels ?? {};
    if (labels[ownerLabel] !== 'isolated-stack' || labels[ownedProjectLabel] !== projectName) {
      throw new Error('Every isolated E2E network must carry the generated ownership labels.');
    }
  }
  const clamav = services.clamav;
  if (clamav) {
    const fixture = clamav.volumes?.[0];
    if (
      clamav.read_only !== true ||
      !clamav.profiles?.includes('malware') ||
      clamav.volumes?.length !== 1 ||
      fixture.type !== 'bind' ||
      fixture.source !== join(composeDirectory, 'e2e/clamd-fixture.mjs') ||
      fixture.target !== '/fixture/clamd-fixture.mjs' ||
      fixture.read_only !== true ||
      clamav.networks?.default === undefined
    ) {
      throw new Error(
        'The local ClamAV service must use the read-only fixture and malware profile.',
      );
    }
  }
  const proxyFixture = proxy.volumes?.[0];
  const proxyTmpfs = new Set(proxy.tmpfs ?? []);
  if (
    proxy.read_only !== true ||
    proxy.volumes?.length !== 1 ||
    proxyFixture.type !== 'bind' ||
    proxyFixture.source !== join(composeDirectory, 'Caddyfile.e2e') ||
    proxyFixture.target !== '/etc/caddy/Caddyfile' ||
    proxyFixture.read_only !== true ||
    !proxyTmpfs.has('/data:rw,noexec,nosuid,nodev,size=32m,uid=0,gid=0,mode=700') ||
    !proxyTmpfs.has('/config:rw,noexec,nosuid,nodev,size=8m,uid=0,gid=0,mode=700')
  ) {
    throw new Error(
      'The local HTTPS proxy must use the read-only configuration and private writable TLS storage.',
    );
  }
  for (const serviceName of ['back', 'migrator', 'fixture']) {
    const service = services[serviceName];
    const serviceEnvironment = service.environment ?? {};
    if (
      service.pull_policy !== 'never' ||
      service.image !== environment.LEDGERLY_E2E_BACK_IMAGE ||
      serviceEnvironment.NODE_ENV !== 'production' ||
      serviceEnvironment.FRONTEND_URL !== environment.E2E_APP_ORIGIN ||
      serviceEnvironment.BACKEND_PUBLIC_URL !== environment.E2E_APP_ORIGIN ||
      serviceEnvironment.BOOTSTRAP_ADMIN_EMAIL !== environment.E2E_BOOTSTRAP_ADMIN_EMAIL ||
      serviceEnvironment.GOOGLE_CLIENT_ID !== environment.E2E_GOOGLE_CLIENT_ID ||
      serviceEnvironment.GOOGLE_CLIENT_SECRET !== environment.E2E_GOOGLE_CLIENT_SECRET ||
      serviceEnvironment.COOKIE_SECURE !== 'true' ||
      serviceEnvironment.TRUST_PROXY !== 'true' ||
      serviceEnvironment.CLAMAV_ENABLED !== 'true'
    ) {
      throw new Error(
        `The ${serviceName} service must use the local production backend image and generated environment.`,
      );
    }
  }
  const front = services.front;
  if (front.pull_policy !== 'never' || front.image !== environment.LEDGERLY_E2E_FRONT_IMAGE) {
    throw new Error('The frontend service must use its prebuilt local production image.');
  }
  const fixtureMounts = services.fixture.volumes ?? [];
  if (
    fixtureMounts.length !== 2 ||
    fixtureMounts[0].type !== 'bind' ||
    fixtureMounts[0].source !== join(repositoryRoot, 'apps/back/test/e2e') ||
    fixtureMounts[0].target !== '/fixture' ||
    fixtureMounts[0].read_only !== true ||
    fixtureMounts[1].type !== 'bind' ||
    fixtureMounts[1].source !==
      join(repositoryRoot, 'deploy/scripts/verify-ledgerly-runtime.mjs') ||
    fixtureMounts[1].target !== '/tmp/verify-ledgerly-runtime.mjs' ||
    fixtureMounts[1].read_only !== true
  ) {
    throw new Error(
      'The local fixture service must use only its read-only test and inventory mounts.',
    );
  }
}

function composeArguments(projectName, profiles = []) {
  return [
    'compose',
    '--project-name',
    projectName,
    '--project-directory',
    composeDirectory,
    '--env-file',
    '/dev/null',
    '--file',
    composeFile,
    ...profiles.flatMap((profile) => ['--profile', profile]),
  ];
}

function labelsMatch(labels, projectName) {
  return (
    labels?.[projectLabel] === projectName &&
    labels?.[ownerLabel] === 'isolated-stack' &&
    labels?.[ownedProjectLabel] === projectName
  );
}

function parseInspectOutput(output, resourceName) {
  try {
    const resources = JSON.parse(output);
    if (!Array.isArray(resources)) throw new Error();
    return resources;
  } catch {
    throw new Error(`Unable to verify ownership labels for ${resourceName}.`);
  }
}

function resourceIds(output) {
  return output.split(/\s+/).filter(Boolean);
}

function createSyntheticEnvironment(
  projectName,
  databaseName,
  databasePort,
  databaseUser,
  databasePassword,
  secret,
  fileKey,
  appOrigin,
) {
  const suffix = projectName.slice(-12);
  const databaseUrl = new URL(`postgresql://127.0.0.1:${databasePort}/${databaseName}`);
  databaseUrl.username = databaseUser;
  databaseUrl.password = databasePassword;
  const storedKeys = JSON.stringify({ v1: fileKey });
  return {
    databaseUrl: databaseUrl.toString(),
    environment: {
      NODE_ENV: 'test',
      PORT: '3000',
      FRONTEND_URL: appOrigin,
      BACKEND_PUBLIC_URL: appOrigin,
      COOKIE_SECURE: 'true',
      TRUST_PROXY: 'true',
      DB_HOST: '127.0.0.1',
      DB_PORT: String(databasePort),
      DB_NAME: databaseName,
      DB_USER: databaseUser,
      DB_PASSWORD: databasePassword,
      DB_TYPEORM_POOL_MAX: '1',
      DB_AUTH_POOL_MAX: '1',
      DB_MIGRATOR_POOL_MAX: '1',
      DB_IDLE_TIMEOUT_MS: '1000',
      DB_CONNECTION_TIMEOUT_MS: '5000',
      DB_STATEMENT_TIMEOUT_MS: '30000',
      DB_QUERY_TIMEOUT_MS: '30000',
      DB_CONNECTION_BUDGET: '8',
      BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      BOOTSTRAP_ADMIN_EMAIL: `e2e-admin-${suffix}@example.com`,
      STORED_FILE_ACTIVE_KEY_VERSION: 'v1',
      STORED_FILE_KEYS: storedKeys,
      CLAMAV_ENABLED: 'true',
      CLAMAV_HOST: 'clamav',
      CLAMAV_PORT: '3310',
      CLAMAV_TIMEOUT_MS: '30000',
      LEDGERLY_MIGRATION_TEST_URL: databaseUrl.toString(),
      E2E_APP_ORIGIN: appOrigin,
      E2E_AUTH_SECRET: secret,
      E2E_STORED_FILE_KEYS: storedKeys,
    },
  };
}

function postgresHostPort(containers, expectedPort) {
  const container = containers.find(
    (resource) => resource.Config?.Labels?.['com.docker.compose.service'] === 'postgres',
  );
  const bindings = container?.NetworkSettings?.Ports?.['5432/tcp'];
  if (
    !Array.isArray(bindings) ||
    bindings.length !== 1 ||
    bindings[0].HostIp !== '127.0.0.1' ||
    Number(bindings[0].HostPort) !== expectedPort
  ) {
    throw new Error(
      `PostgreSQL must publish one port on the local loopback interface; observed ${JSON.stringify({ bindings, labels: container?.Config?.Labels, portBindings: container?.HostConfig?.PortBindings })}.`,
    );
  }
  const port = Number(bindings[0].HostPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Docker did not allocate a valid ephemeral PostgreSQL port.');
  }
  return port;
}

function publishedHostPort(containers, serviceName, targetPort, expectedPort) {
  const container = containers.find(
    (resource) => resource.Config?.Labels?.['com.docker.compose.service'] === serviceName,
  );
  const bindings = container?.NetworkSettings?.Ports?.[`${targetPort}/tcp`];
  if (
    !Array.isArray(bindings) ||
    bindings.length !== 1 ||
    bindings[0].HostIp !== '127.0.0.1' ||
    Number(bindings[0].HostPort) !== expectedPort
  ) {
    throw new Error(`The isolated ${serviceName} service must publish one port on local loopback.`);
  }
  return Number(bindings[0].HostPort);
}

function selectEphemeralLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

function runDocker(args, options) {
  return runProcess('docker', args, options);
}

export async function assertLocalDocker({
  runCommand = runDocker,
  sourceEnvironment = process.env,
} = {}) {
  if (sourceEnvironment.DOCKER_HOST && sourceEnvironment.DOCKER_CONTEXT) {
    throw new Error('Set only one of DOCKER_HOST or DOCKER_CONTEXT before isolated E2E tests.');
  }
  let contextName = sourceEnvironment.DOCKER_CONTEXT;
  let endpoint = sourceEnvironment.DOCKER_HOST;
  if (!endpoint) {
    contextName ||= await runCommand(['context', 'show'], {
      env: dockerEnvironment(sourceEnvironment),
    });
    const contextOutput = await runCommand(['context', 'inspect', contextName], {
      env: dockerEnvironment(sourceEnvironment),
    });
    let contexts;
    try {
      contexts = JSON.parse(contextOutput);
    } catch {
      throw new Error('Unable to inspect the active Docker context.');
    }
    endpoint = contexts?.[0]?.Endpoints?.docker?.Host;
  }
  assertLocalEndpoint(endpoint);
  let composeVersion;
  try {
    composeVersion = await runCommand(['compose', 'version', '--short'], {
      env: dockerEnvironment(sourceEnvironment),
    });
    await runCommand(['info', '--format', '{{.ServerVersion}}'], {
      env: dockerEnvironment(sourceEnvironment),
    });
  } catch (error) {
    if (error?.code === 'ENOENT')
      throw new Error(
        'The Docker CLI and local Docker daemon are required for isolated E2E tests.',
      );
    throw error;
  }
  const version = /^(?:v)?(\d+)\.(\d+)/.exec(composeVersion.trim());
  if (!version || Number(version[1]) < 2 || (Number(version[1]) === 2 && Number(version[2]) < 20)) {
    throw new Error('Docker Compose 2.20 or later is required for isolated E2E tests.');
  }
  return { contextName, endpoint };
}

export async function withIsolatedStack(
  { databaseName = 'ledgerly_migration_test', services = ['postgres'], profiles = [] } = {},
  operation,
  dependencies = {},
) {
  if (typeof operation !== 'function') throw new Error('An isolated E2E operation is required.');
  validateDatabaseName(databaseName);
  assertRequestedResources(services, profiles);

  const sourceEnvironment = dependencies.sourceEnvironment ?? process.env;
  assertNoExternalDatabase(sourceEnvironment);

  const projectName = `ledgerly-e2e-${randomBytes(8).toString('hex')}`;
  const databaseUser = `e2e_${randomBytes(6).toString('hex')}`;
  const databasePassword = randomBytes(32).toString('base64url');
  const secret = randomBytes(48).toString('base64url');
  const fileKey = randomBytes(32).toString('base64');
  const bootstrapAdminEmail = `e2e-admin-${projectName.slice(-12)}@example.com`;
  const googleClientId = `e2e-${projectName.slice(-12)}.apps.googleusercontent.com`;
  const googleClientSecret = randomBytes(32).toString('base64url');
  const backendImage = sourceEnvironment.LEDGERLY_E2E_BACK_IMAGE ?? 'ledgerly-e2e-back:missing';
  const frontendImage = sourceEnvironment.LEDGERLY_E2E_FRONT_IMAGE ?? 'ledgerly-e2e-front:missing';
  const controller = new AbortController();
  const runCommand = dependencies.runCommand ?? runDocker;
  const signalTarget = dependencies.signalTarget ?? process;
  const commandEnvironment = {
    ...dockerEnvironment(sourceEnvironment),
    E2E_PROJECT_NAME: projectName,
    E2E_DB_NAME: databaseName,
    E2E_DB_USER: databaseUser,
    E2E_DB_PASSWORD: databasePassword,
    E2E_AUTH_SECRET: secret,
    E2E_STORED_FILE_KEYS: JSON.stringify({ v1: fileKey }),
    E2E_BOOTSTRAP_ADMIN_EMAIL: bootstrapAdminEmail,
    E2E_GOOGLE_CLIENT_ID: googleClientId,
    E2E_GOOGLE_CLIENT_SECRET: googleClientSecret,
    LEDGERLY_E2E_BACK_IMAGE: backendImage,
    LEDGERLY_E2E_FRONT_IMAGE: frontendImage,
  };
  const inheritedTestEnvironment = testEnvironment(sourceEnvironment);
  let interruptedSignal;
  let stackStarted = false;
  let callbackError;
  let cleanupError;
  let databaseUrl;
  let databasePort;
  let proxyPort;
  let appOrigin;

  const interrupt = (signal) => {
    interruptedSignal = signal;
    controller.abort(new Error(`Isolated E2E stack interrupted by ${signal}.`));
  };
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  signalTarget.once('SIGINT', onInterrupt);
  signalTarget.once('SIGTERM', onTerminate);

  const compose = (profilesForCommand = profiles) =>
    composeArguments(projectName, profilesForCommand);
  const startedServices = new Set();
  const startedProfiles = new Set(profiles);

  async function validateOwnership() {
    let containers = [];
    const containerIds = resourceIds(
      await runCommand(['ps', '-aq', '--filter', `label=${projectLabel}=${projectName}`], {
        env: commandEnvironment,
      }),
    );
    if (containerIds.length) {
      containers = parseInspectOutput(
        await runCommand(['inspect', ...containerIds], {
          env: commandEnvironment,
        }),
        'containers',
      );
      if (containers.some((container) => !labelsMatch(container.Config?.Labels, projectName))) {
        throw new Error(
          `Refusing to clean Compose project ${projectName}: a container failed ownership validation.`,
        );
      }
    }

    const networkIds = resourceIds(
      await runCommand(
        ['network', 'ls', '-q', '--filter', `label=${projectLabel}=${projectName}`],
        { env: commandEnvironment },
      ),
    );
    if (networkIds.length) {
      const networks = parseInspectOutput(
        await runCommand(['network', 'inspect', ...networkIds], {
          env: commandEnvironment,
        }),
        'networks',
      );
      if (networks.some((network) => !labelsMatch(network.Labels, projectName))) {
        throw new Error(
          `Refusing to clean Compose project ${projectName}: a network failed ownership validation.`,
        );
      }
    }
    return { containers };
  }

  async function cleanup() {
    if (!stackStarted) return;
    await validateOwnership();
    await runCommand([...compose([...startedProfiles]), 'down', '--volumes', '--remove-orphans'], {
      env: commandEnvironment,
    });
    stackStarted = false;
  }

  const stack = {
    projectName,
    get databaseUrl() {
      if (!databaseUrl) throw new Error('Start PostgreSQL before requesting its connection URL.');
      return databaseUrl;
    },
    get origin() {
      if (!appOrigin)
        throw new Error('Start the isolated HTTPS proxy before requesting its origin.');
      return appOrigin;
    },
    environment: inheritedTestEnvironment,
    async up({
      services: nextServices = services,
      profiles: nextProfiles = profiles,
      signal = controller.signal,
    } = {}) {
      assertRequestedResources(nextServices, nextProfiles);
      if (nextServices.some((service) => !longRunningServices.has(service))) {
        throw new Error('One-off migration and fixture services must run through stack.run().');
      }
      if (!stackStarted && !nextServices.includes('postgres')) {
        throw new Error('Start the isolated PostgreSQL service before adding other E2E services.');
      }
      for (const service of nextServices) startedServices.add(service);
      for (const profile of nextProfiles) startedProfiles.add(profile);
      await assertLocalDocker({ runCommand, sourceEnvironment });
      databasePort ??= await selectEphemeralLoopbackPort();
      proxyPort ??= await selectEphemeralLoopbackPort();
      appOrigin ??= `https://localhost:${proxyPort}`;
      commandEnvironment.E2E_DB_PUBLISHED_PORT = String(databasePort);
      commandEnvironment.E2E_PROXY_PUBLISHED_PORT = String(proxyPort);
      commandEnvironment.E2E_APP_ORIGIN = appOrigin;
      const configOutput = await runCommand(
        [...compose([...allowedProfiles]), 'config', '--format', 'json'],
        { env: commandEnvironment, signal },
      );
      let configuration;
      try {
        configuration = JSON.parse(configOutput);
      } catch {
        throw new Error('Docker Compose returned invalid configuration for the isolated stack.');
      }
      assertComposeConfiguration(
        configuration,
        projectName,
        databasePort,
        proxyPort,
        commandEnvironment,
      );
      if (
        nextServices.some(
          (service) => service === 'back' || service === 'migrator' || service === 'fixture',
        )
      ) {
        await runCommand(['image', 'inspect', backendImage], { env: commandEnvironment, signal });
      }
      if (nextServices.includes('front')) {
        await runCommand(['image', 'inspect', frontendImage], { env: commandEnvironment, signal });
      }
      stackStarted = true;
      try {
        await runCommand(
          [
            ...compose(nextProfiles),
            'up',
            '--detach',
            '--wait',
            '--wait-timeout',
            '90',
            ...nextServices,
          ],
          { env: commandEnvironment, signal },
        );
      } catch (error) {
        let serviceLogs = '';
        try {
          serviceLogs = await runCommand(
            [...compose(nextProfiles), 'logs', '--no-color', '--tail', '80', ...nextServices],
            { env: commandEnvironment },
          );
        } catch {
          serviceLogs = '';
        }
        if (serviceLogs) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`${message}\nIsolated E2E service logs:\n${serviceLogs}`, {
            cause: error,
          });
        }
        throw error;
      }
      const { containers } = await validateOwnership();
      const publishedPort = postgresHostPort(containers, databasePort);
      const database = createSyntheticEnvironment(
        projectName,
        databaseName,
        publishedPort,
        databaseUser,
        databasePassword,
        secret,
        fileKey,
        appOrigin,
      );
      Object.assign(stack.environment, database.environment);
      databaseUrl = database.databaseUrl;
      if (nextServices.includes('proxy')) publishedHostPort(containers, 'proxy', 443, proxyPort);
      return stack;
    },
    async exec(service, command, { signal = controller.signal } = {}) {
      if (
        !stackStarted ||
        !startedServices.has(service) ||
        !Array.isArray(command) ||
        command.length === 0 ||
        command.some((argument) => typeof argument !== 'string')
      ) {
        throw new Error('Exec requires an allowed service and a non-empty argument list.');
      }
      await validateOwnership();
      return runCommand(
        [
          ...compose(serviceProfiles.has(service) ? [serviceProfiles.get(service)] : []),
          'exec',
          '--no-TTY',
          service,
          ...command,
        ],
        { env: commandEnvironment, signal },
      );
    },
    async run(service, command, { signal = controller.signal } = {}) {
      if (
        !stackStarted ||
        !allowedServices.has(service) ||
        (serviceProfiles.has(service) && !startedProfiles.has(serviceProfiles.get(service))) ||
        !Array.isArray(command) ||
        command.length === 0 ||
        command.some((argument) => typeof argument !== 'string')
      ) {
        throw new Error('Run requires a declared service and a non-empty argument list.');
      }
      await validateOwnership();
      const image = service === 'front' ? frontendImage : backendImage;
      if (service !== 'postgres' && service !== 'clamav') {
        await runCommand(['image', 'inspect', image], { env: commandEnvironment, signal });
      }
      return runCommand(
        [
          ...compose(serviceProfiles.has(service) ? [serviceProfiles.get(service)] : []),
          'run',
          '--rm',
          '--no-deps',
          '--no-TTY',
          service,
          ...command,
        ],
        { env: commandEnvironment, signal },
      );
    },
    cleanup,
  };

  let result;
  try {
    result = await operation(stack, { signal: controller.signal });
  } catch (error) {
    callbackError = error;
  } finally {
    signalTarget.removeListener('SIGINT', onInterrupt);
    signalTarget.removeListener('SIGTERM', onTerminate);
    try {
      await cleanup();
    } catch (error) {
      cleanupError = error;
    }
  }

  if (interruptedSignal) process.exitCode = interruptedSignal === 'SIGINT' ? 130 : 143;
  if (callbackError && cleanupError)
    throw new AggregateError(
      [callbackError, cleanupError],
      'The isolated E2E operation and cleanup both failed.',
    );
  if (callbackError) throw callbackError;
  if (cleanupError) throw cleanupError;
  return result;
}
