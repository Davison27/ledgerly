import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const composePath = 'apps/back/docker-compose.yml';
const environmentPath = 'apps/back/.env';
const confirmationToken = 'RESET_LEDGERLY_DEV';
const postgresDataPath = '/var/lib/postgresql/data';
const legacyProject = 'back';
const futureProject = 'ledgerly-dev';
const legacyVolume = 'back_ledgerly-pgdata';
const futureVolume = 'ledgerly-dev_ledgerly-pgdata';
const allowedServices = new Set(['postgres', 'migrator', 'back']);

const failedPlan = (errors) => ({ ok: false, errors, commands: [] });

const labelsMatch = (labels, expected) =>
  Object.entries(expected).every(([key, value]) => labels?.[key] === value);

const isLocalUnixEndpoint = (endpoint) => {
  try {
    const parsed = new URL(endpoint);
    return parsed.protocol === 'unix:' && parsed.hostname === '' && parsed.pathname.startsWith('/');
  } catch {
    return false;
  }
};

const projectResources = (resources, project, volumeName) => {
  const containers = resources.containers.filter(
    (container) =>
      container.labels?.['com.docker.compose.project'] === project ||
      (container.name === 'ledgerly-postgres' &&
        !container.labels?.['com.docker.compose.project']),
  );

  return {
    containers,
    networks: resources.networks.filter(
      (network) => network.labels?.['com.docker.compose.project'] === project,
    ),
    volumes: resources.volumes.filter(
      (volume) =>
        volume.labels?.['com.docker.compose.project'] === project || volume.name === volumeName,
    ),
    volumeConsumers: resources.volumeConsumers,
  };
};

const validateComposeConfiguration = (composeConfig) => {
  const volumeNames = Object.keys(composeConfig?.volumes ?? {});
  const postgresVolumes = composeConfig?.services?.postgres?.volumes;

  if (volumeNames.length !== 1 || volumeNames[0] !== 'ledgerly-pgdata') {
    return 'The local Compose configuration must define exactly ledgerly-pgdata.';
  }
  if (!Array.isArray(postgresVolumes) || postgresVolumes.length !== 1) {
    return 'The local Compose configuration must mount exactly one PostgreSQL data volume.';
  }

  const [postgresVolume] = postgresVolumes;
  if (
    postgresVolume?.type !== 'volume' ||
    postgresVolume.source !== 'ledgerly-pgdata' ||
    postgresVolume.target !== postgresDataPath
  ) {
    return 'The local Compose PostgreSQL mount is not the expected named data volume.';
  }

  return undefined;
};

const validateProjectTopology = (resources, project, engineVolume) => {
  const expectedContainerLabels = {
    'com.docker.compose.project': project,
    'com.docker.compose.service': 'postgres',
  };
  const expectedVolumeLabels = {
    'com.docker.compose.project': project,
    'com.docker.compose.volume': 'ledgerly-pgdata',
  };

  if (resources.volumes.length !== 1 || resources.volumes[0].name !== engineVolume) {
    return 'The expected engine volume is missing or ambiguous.';
  }
  if (!labelsMatch(resources.volumes[0].labels, expectedVolumeLabels)) {
    return 'The expected engine volume labels do not match.';
  }
  if (resources.containers.length === 0) {
    return 'The expected PostgreSQL container is missing.';
  }
  if (
    resources.containers.some(
      (container) =>
        !allowedServices.has(container.labels?.['com.docker.compose.service']) ||
        container.labels?.['com.docker.compose.project'] !== project,
    )
  ) {
    return 'The Compose project contains an unexpected or unlabeled container.';
  }

  const postgresContainers = resources.containers.filter(
    (container) => container.labels?.['com.docker.compose.service'] === 'postgres',
  );
  if (postgresContainers.length !== 1 || postgresContainers[0].name !== 'ledgerly-postgres') {
    return 'The expected PostgreSQL container is missing or ambiguous.';
  }

  const [postgres] = postgresContainers;
  if (!labelsMatch(postgres.labels, expectedContainerLabels)) {
    return 'The PostgreSQL container labels do not match.';
  }
  if (
    postgres.mounts.length !== 1 ||
    postgres.mounts[0]?.type !== 'volume' ||
    postgres.mounts[0]?.source !== engineVolume ||
    postgres.mounts[0]?.destination !== postgresDataPath
  ) {
    return 'The PostgreSQL data mount is not the expected exclusive named volume.';
  }
  if (
    resources.volumeConsumers.length !== 1 ||
    resources.volumeConsumers[0] !== postgres.id
  ) {
    return 'The PostgreSQL data volume is shared or has an unexpected consumer.';
  }
  if (
    resources.networks.some(
      (network) => network.labels?.['com.docker.compose.project'] !== project,
    )
  ) {
    return 'The Compose project contains an unlabeled or unexpected network.';
  }

  return undefined;
};

const command = (kind, project, action) => ({
  kind,
  file: 'docker',
  args: [
    'compose',
    '--project-name',
    project,
    '-f',
    composePath,
    '--env-file',
    environmentPath,
    ...action,
  ],
});

const commandSequence = (project, includeRemoval) => [
  ...(includeRemoval ? [command('down', project, ['down', '--volumes'])] : []),
  command('postgres-up', futureProject, ['up', '-d', '--wait', 'postgres']),
  command('migrate', futureProject, ['run', '--rm', 'migrator']),
  command('back-up', futureProject, ['up', '-d', '--wait', 'back']),
];

export const resolveResetPlan = (input) => {
  const errors = [];

  if (input.confirmation !== confirmationToken) {
    errors.push('The exact reset confirmation token is required.');
  }
  if (input.deployEnvironmentExists) {
    errors.push('The deployment environment exists. Local reset is refused.');
  }
  if (input.composePath !== composePath || !input.environmentFileExists) {
    errors.push('The canonical local Compose file and environment file are required.');
  }
  if (input.composeProjectOverride) {
    errors.push('COMPOSE_PROJECT_NAME is set. Local reset is refused.');
  }
  if (input.dockerHost) {
    errors.push('DOCKER_HOST is set. Local reset accepts only the selected local context.');
  }
  if (!['default', 'desktop-linux'].includes(input.context?.name)) {
    errors.push('The Docker context is not allowlisted for local reset.');
  }
  if (!isLocalUnixEndpoint(input.context?.endpoint)) {
    errors.push('The Docker context endpoint is not a local Unix socket.');
  }
  if (input.environment?.NODE_ENV !== 'development') {
    errors.push('NODE_ENV must be development.');
  }
  if (!['localhost', '127.0.0.1', 'postgres'].includes(input.environment?.DB_HOST)) {
    errors.push('DB_HOST is not an allowlisted local value.');
  }
  if (input.environment?.DB_NAME !== 'ledgerly' || input.environment?.DB_USER !== 'ledgerly') {
    errors.push('DB_NAME and DB_USER must both be ledgerly.');
  }
  if (
    input.resources?.containers.some(
      (container) =>
        container.name === 'ledgerly-postgres' &&
        ![legacyProject, futureProject].includes(container.labels?.['com.docker.compose.project']),
    )
  ) {
    errors.push('The PostgreSQL container has an unexpected or missing Compose project label.');
  }

  const configurationError = validateComposeConfiguration(input.composeConfig);
  if (configurationError) {
    errors.push(configurationError);
  }
  if (errors.length > 0) {
    return failedPlan(errors);
  }

  const legacy = projectResources(input.resources, legacyProject, legacyVolume);
  const future = projectResources(input.resources, futureProject, futureVolume);
  const legacyPresent =
    legacy.containers.length > 0 || legacy.networks.length > 0 || legacy.volumes.length > 0;
  const futurePresent =
    future.containers.length > 0 || future.networks.length > 0 || future.volumes.length > 0;

  if (legacyPresent && futurePresent) {
    return failedPlan(['Legacy and future local Compose resources coexist.']);
  }
  if (legacyPresent) {
    const topologyError = validateProjectTopology(legacy, legacyProject, legacyVolume);
    if (topologyError) {
      return failedPlan([topologyError]);
    }
    return {
      ok: true,
      mode: 'legacy-transition',
      errors: [],
      inspection: {
        project: legacyProject,
        container: legacy.containers.find(
          (container) => container.labels['com.docker.compose.service'] === 'postgres',
        ),
        volume: legacy.volumes[0],
      },
      commands: commandSequence(legacyProject, true),
    };
  }
  if (futurePresent) {
    const topologyError = validateProjectTopology(future, futureProject, futureVolume);
    if (topologyError) {
      return failedPlan([topologyError]);
    }
    return {
      ok: true,
      mode: 'future-reset',
      errors: [],
      inspection: {
        project: futureProject,
        container: future.containers.find(
          (container) => container.labels['com.docker.compose.service'] === 'postgres',
        ),
        volume: future.volumes[0],
      },
      commands: commandSequence(futureProject, true),
    };
  }

  return {
    ok: true,
    mode: 'bootstrap',
    errors: [],
    inspection: { project: futureProject, container: undefined, volume: undefined },
    commands: commandSequence(futureProject, false),
  };
};

export const runResetPlan = async (plan, operations) => {
  if (!plan.ok) {
    throw new Error(plan.errors.join(' '));
  }

  for (const commandToRun of plan.commands) {
    if (commandToRun.kind === 'postgres-up' && plan.mode !== 'bootstrap') {
      await operations.assertAbsent(plan.inspection);
    }
    await operations.execute(commandToRun);
  }
};

const parseEnvironment = (content) => {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }
  return values;
};

const runReadOnlyDocker = (args) =>
  execFileSync('docker', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim();

const inspectJson = (args) => JSON.parse(runReadOnlyDocker(args));

const identifiersFor = (args) => {
  const output = runReadOnlyDocker(args);
  return output ? output.split('\n').filter(Boolean) : [];
};

const inspectOptionalJson = (args) => {
  try {
    return inspectJson(args);
  } catch (error) {
    if (error.status === 1) {
      return undefined;
    }
    throw error;
  }
};

const dockerResources = (project, engineVolume, includeNamedContainer) => {
  const containerIds = identifiersFor([
    'ps',
    '--all',
    '--filter',
    `label=com.docker.compose.project=${project}`,
    '--format',
    '{{.ID}}',
  ]);
  const namedContainer = inspectOptionalJson(['container', 'inspect', 'ledgerly-postgres'])?.[0];
  const containers = [
    ...containerIds.map((id) => inspectJson(['container', 'inspect', id])[0]),
    ...(includeNamedContainer && namedContainer && !containerIds.includes(namedContainer.Id)
      ? [namedContainer]
      : []),
  ].map((container) => ({
    id: container.Id,
    name: container.Name.replace(/^\//, ''),
    labels: container.Config.Labels ?? {},
    mounts: container.Mounts.map((mount) => ({
      type: mount.Type,
      source: mount.Name ?? mount.Source,
      destination: mount.Destination,
    })),
  }));
  const networkIds = identifiersFor([
    'network',
    'ls',
    '--filter',
    `label=com.docker.compose.project=${project}`,
    '--format',
    '{{.ID}}',
  ]);
  const networks = networkIds.map((id) => {
    const network = inspectJson(['network', 'inspect', id])[0];
    return { id: network.Id, name: network.Name, labels: network.Labels ?? {} };
  });
  const volumeNames = identifiersFor([
    'volume',
    'ls',
    '--filter',
    `label=com.docker.compose.project=${project}`,
    '--format',
    '{{.Name}}',
  ]);
  if (!volumeNames.includes(engineVolume) && inspectOptionalJson(['volume', 'inspect', engineVolume])) {
    volumeNames.push(engineVolume);
  }
  const volumes = volumeNames.map((name) => {
    const volume = inspectJson(['volume', 'inspect', name])[0];
    return { name: volume.Name, labels: volume.Labels ?? {} };
  });
  const volumeConsumers = identifiersFor([
    'ps',
    '--all',
    '--filter',
    `volume=${engineVolume}`,
    '--format',
    '{{.ID}}',
  ]);

  return { containers, networks, volumes, volumeConsumers };
};

const selectedContext = () => {
  const name = runReadOnlyDocker(['context', 'show']);
  const encodedEndpoint = runReadOnlyDocker([
    'context',
    'inspect',
    name,
    '--format',
    '{{json .Endpoints.docker.Host}}',
  ]);
  return { name, endpoint: JSON.parse(encodedEndpoint) };
};

const runtimeInput = () => {
  const environmentFile = path.join(repositoryRoot, environmentPath);
  const localEnvironment = existsSync(environmentFile)
    ? parseEnvironment(readFileSync(environmentFile, 'utf8'))
    : {};
  const environment = Object.fromEntries(
    ['NODE_ENV', 'DB_HOST', 'DB_NAME', 'DB_USER'].map((name) => [
      name,
      process.env[name] ?? localEnvironment[name],
    ]),
  );
  const context = selectedContext();
  const resolvedCompose = inspectJson([
    'compose',
    '--project-name',
    futureProject,
    '-f',
    composePath,
    '--env-file',
    environmentPath,
    'config',
    '--format',
    'json',
  ]);
  const legacyResources = dockerResources(legacyProject, legacyVolume, true);
  const futureResources = dockerResources(futureProject, futureVolume, false);

  return {
    confirmation: process.env.CONFIRM,
    deployEnvironmentExists: existsSync(path.join(repositoryRoot, 'deploy/.env')),
    composePath,
    environmentFileExists: existsSync(environmentFile),
    environment,
    composeProjectOverride: process.env.COMPOSE_PROJECT_NAME,
    dockerHost: process.env.DOCKER_HOST,
    context,
    composeConfig: resolvedCompose,
    resources: {
      containers: [...legacyResources.containers, ...futureResources.containers],
      networks: [...legacyResources.networks, ...futureResources.networks],
      volumes: [...legacyResources.volumes, ...futureResources.volumes],
      volumeConsumers: [...legacyResources.volumeConsumers, ...futureResources.volumeConsumers],
    },
  };
};

const runtimeOperations = {
  execute: async (commandToRun) => {
    execFileSync(commandToRun.file, commandToRun.args, {
      cwd: repositoryRoot,
      stdio: 'inherit',
    });
  },
  assertAbsent: async (inspection) => {
    if (inspectOptionalJson(['container', 'inspect', 'ledgerly-postgres'])) {
      throw new Error('The inspected PostgreSQL container still exists after Compose removal.');
    }
    const engineVolume = inspection.project === legacyProject ? legacyVolume : futureVolume;
    if (inspectOptionalJson(['volume', 'inspect', engineVolume])) {
      throw new Error('The inspected PostgreSQL data volume still exists after Compose removal.');
    }
  },
};

const displayPlan = (plan) => {
  process.stdout.write(`Reset mode: ${plan.mode}\n`);
  if (plan.inspection.container) {
    process.stdout.write(`Container: ${plan.inspection.container.id} ${plan.inspection.container.name}\n`);
    process.stdout.write(`Labels: ${JSON.stringify(plan.inspection.container.labels)}\n`);
    process.stdout.write(`Mounts: ${JSON.stringify(plan.inspection.container.mounts)}\n`);
  }
  if (plan.inspection.volume) {
    process.stdout.write(`Volume: ${plan.inspection.volume.name}\n`);
    process.stdout.write(`Labels: ${JSON.stringify(plan.inspection.volume.labels)}\n`);
  }
  for (const commandToRun of plan.commands) {
    process.stdout.write(`${commandToRun.file} ${commandToRun.args.join(' ')}\n`);
  }
};

const main = async () => {
  const plan = resolveResetPlan(runtimeInput());
  if (!plan.ok) {
    throw new Error(plan.errors.join('\n'));
  }
  displayPlan(plan);
  if (process.env.DRY_RUN === '1') {
    return;
  }
  await runResetPlan(plan, runtimeOperations);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
