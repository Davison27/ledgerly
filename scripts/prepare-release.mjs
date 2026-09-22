import {
  compareVersions,
  getRepositoryPaths,
  isReleaseDate,
  isStableReleaseVersion,
  readJson,
  validateLocale,
  validateReleaseContract,
  validateReleaseRegistry,
  writeFilesAtomically,
  writeJson,
} from './release-contract.mjs';

const bumps = new Set(['major', 'minor', 'patch']);

export const calculateNextVersion = (version, bump) => {
  if (!isStableReleaseVersion(version)) throw new Error(`Current version is not a stable SemVer: ${version}`);
  if (!bumps.has(bump)) throw new Error(`Bump must be one of major, minor, or patch: ${bump}`);
  const [major, minor, patch] = version.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

export const parseReleaseArguments = (argumentsList) => {
  let bump;
  let date;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument === '--bump' || argument === '--date') {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value`);
      if (argument === '--bump') bump = value;
      else date = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--bump=')) bump = argument.slice('--bump='.length);
    else if (argument.startsWith('--date=')) date = argument.slice('--date='.length);
    else if (!bump) bump = argument;
    else if (!date) date = argument;
    else throw new Error(`Unexpected argument: ${argument}`);
  }
  if (!bump || !date) throw new Error('Usage: pnpm prepare-release <major|minor|patch> <YYYY-MM-DD>');
  if (!bumps.has(bump)) throw new Error(`Bump must be one of major, minor, or patch: ${bump}`);
  if (!isReleaseDate(date)) throw new Error(`Release date must be an ISO calendar date: ${date}`);
  return { bump, date };
};

export const prepareRelease = ({ root, bump, date } = {}) => {
  const paths = getRepositoryPaths(root);
  const manifests = [paths.packageManifest, paths.frontManifest, paths.backManifest].map((filePath) => [
    filePath,
    readJson(filePath),
  ]);
  const versions = manifests.map(([, manifest]) => manifest.version);
  if (versions.some((version) => !isStableReleaseVersion(version))) {
    throw new Error(`All package versions must use stable SemVer: ${versions.join(', ')}`);
  }
  if (new Set(versions).size !== 1) throw new Error(`Package versions diverge: ${versions.join(', ')}`);
  const currentVersion = versions[0];
  const registry = readJson(paths.registry);
  const registryErrors = validateReleaseRegistry(registry);
  const localeErrors = [
    ...validateLocale(readJson(paths.englishLocale), registry, 'en'),
    ...validateLocale(readJson(paths.spanishLocale), registry, 'es'),
  ];
  const contractErrors = validateReleaseContract({ root });
  if (registryErrors.length > 0 || localeErrors.length > 0 || contractErrors.length > 0) {
    throw new Error(
      ['The current release contract is incomplete or divergent.', ...new Set([...registryErrors, ...localeErrors, ...contractErrors])].join(
        '\n',
      ),
    );
  }
  const nextVersion = calculateNextVersion(currentVersion, bump);
  if (compareVersions(nextVersion, currentVersion) <= 0) {
    throw new Error(`Next version ${nextVersion} is not greater than ${currentVersion}`);
  }
  if (registry.releases.some((release) => release.version === nextVersion)) {
    throw new Error(`Release version already exists: ${nextVersion}`);
  }
  const nextRegistry = {
    currentVersion: nextVersion,
    releases: [{ version: nextVersion, date, entries: [] }, ...registry.releases],
  };
  const nextManifests = manifests.map(([filePath, manifest]) => [
    filePath,
    writeJson(filePath, { ...manifest, version: nextVersion }),
  ]);
  writeFilesAtomically([
    ...nextManifests,
    [paths.registry, writeJson(paths.registry, nextRegistry)],
  ]);
  return nextVersion;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseReleaseArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write('Usage: pnpm prepare-release <major|minor|patch> <YYYY-MM-DD>\n');
    } else {
      const nextVersion = prepareRelease(options);
      process.stdout.write(
        `Prepared ${nextVersion}. Add release entries and both locale translations, then run pnpm generate-changelog and pnpm verify:release.\n`,
      );
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
