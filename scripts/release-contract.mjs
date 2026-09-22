import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptsDirectory, '..');

export const RELEASE_VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
export const RELEASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
export const RELEASE_CATEGORIES = ['added', 'changed', 'fixed', 'security'];
export const RELEASE_UI_PATHS = [
  ['changelog', 'title'],
  ['changelog', 'description'],
  ['changelog', 'currentVersion'],
  ['changelog', 'releasedOn'],
  ['changelog', 'empty'],
  ['dialog', 'title'],
  ['dialog', 'description'],
  ['dialog', 'acknowledge'],
  ['dialog', 'viewFullChangelog'],
  ['dialog', 'error'],
  ['dialog', 'retry'],
];

export const getRepositoryPaths = (root = repositoryRoot) => ({
  root,
  packageManifest: path.join(root, 'package.json'),
  frontManifest: path.join(root, 'apps/front/package.json'),
  backManifest: path.join(root, 'apps/back/package.json'),
  registry: path.join(root, 'apps/front/src/entities/release-note/config/release-notes.json'),
  englishLocale: path.join(root, 'apps/front/src/shared/i18n/locales/en.json'),
  spanishLocale: path.join(root, 'apps/front/src/shared/i18n/locales/es.json'),
  changelog: path.join(root, 'CHANGELOG.md'),
});

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const exactKeys = (value, expected) => {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  return actual.length === expectedKeys.length && actual.every((key, index) => key === expectedKeys[index]);
};

const pathLabel = (parts) => parts.join('.');

export const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

export const writeJson = (filePath, value) => `${JSON.stringify(value, null, 2)}\n`;

export const compareVersions = (left, right) => {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
};

export const isStableReleaseVersion = (value) =>
  typeof value === 'string' && RELEASE_VERSION_PATTERN.test(value);

export const isReleaseDate = (value) => {
  if (typeof value !== 'string' || !RELEASE_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export const releaseLocaleKey = (version) => `v${version.replaceAll('.', '_')}`;

export const validateReleaseRegistry = (registry, { allowIncomplete = false } = {}) => {
  const errors = [];
  if (!exactKeys(registry, ['currentVersion', 'releases'])) {
    errors.push('registry must contain exactly currentVersion and releases');
    return errors;
  }
  if (!isStableReleaseVersion(registry.currentVersion)) {
    errors.push(`registry.currentVersion is not a stable SemVer: ${registry.currentVersion}`);
  }
  if (!Array.isArray(registry.releases) || registry.releases.length === 0) {
    errors.push('registry.releases must contain at least one release');
    return errors;
  }

  const releaseVersions = new Set();
  const entryIds = new Set();
  for (let index = 0; index < registry.releases.length; index += 1) {
    const release = registry.releases[index];
    const releaseLabel = `registry.releases[${index}]`;
    if (!exactKeys(release, ['version', 'date', 'entries'])) {
      errors.push(`${releaseLabel} must contain exactly version, date, and entries`);
      continue;
    }
    if (!isStableReleaseVersion(release.version)) {
      errors.push(`${releaseLabel}.version is not a stable SemVer: ${release.version}`);
    }
    if (!isReleaseDate(release.date)) {
      errors.push(`${releaseLabel}.date is not an ISO calendar date: ${release.date}`);
    }
    if (releaseVersions.has(release.version)) {
      errors.push(`duplicate release version: ${release.version}`);
    }
    releaseVersions.add(release.version);
    if (!Array.isArray(release.entries) || (!allowIncomplete && release.entries.length === 0)) {
      errors.push(`${releaseLabel}.entries must contain at least one entry`);
      continue;
    }
    const releaseEntryIds = new Set();
    for (let entryIndex = 0; entryIndex < release.entries.length; entryIndex += 1) {
      const entry = release.entries[entryIndex];
      const entryLabel = `${releaseLabel}.entries[${entryIndex}]`;
      if (!exactKeys(entry, ['id', 'category'])) {
        errors.push(`${entryLabel} must contain exactly id and category`);
        continue;
      }
      if (typeof entry.id !== 'string' || entry.id.length === 0 || /\s/u.test(entry.id)) {
        errors.push(`${entryLabel}.id must be a non-empty stable string`);
      }
      if (releaseEntryIds.has(entry.id)) errors.push(`duplicate entry ID in ${release.version}: ${entry.id}`);
      if (entryIds.has(entry.id)) errors.push(`entry ID is not globally unique: ${entry.id}`);
      releaseEntryIds.add(entry.id);
      entryIds.add(entry.id);
      if (!RELEASE_CATEGORIES.includes(entry.category)) {
        errors.push(`${entryLabel}.category is invalid: ${entry.category}`);
      }
    }
  }

  for (let index = 1; index < registry.releases.length; index += 1) {
    const previous = registry.releases[index - 1]?.version;
    const current = registry.releases[index]?.version;
    if (isStableReleaseVersion(previous) && isStableReleaseVersion(current) && compareVersions(previous, current) <= 0) {
      errors.push(`releases must be strictly newest-first: ${previous} before ${current}`);
    }
  }
  if (
    isStableReleaseVersion(registry.currentVersion) &&
    isStableReleaseVersion(registry.releases[0]?.version) &&
    registry.currentVersion !== registry.releases[0].version
  ) {
    errors.push(
      `registry.currentVersion ${registry.currentVersion} must equal newest release ${registry.releases[0].version}`,
    );
  }
  return errors;
};

const readNested = (value, parts) => parts.reduce((current, part) => current?.[part], value);

export const validateLocale = (locale, registry, language) => {
  const errors = [];
  const prefix = `${language}.releaseNotes`;
  if (!isRecord(locale) || !isRecord(locale.releaseNotes)) {
    return [`${prefix} is missing`];
  }
  const releaseNotes = locale.releaseNotes;
  if (!isRecord(releaseNotes.categories) || !exactKeys(releaseNotes.categories, RELEASE_CATEGORIES)) {
    errors.push(`${prefix}.categories must contain exactly ${RELEASE_CATEGORIES.join(', ')}`);
  } else {
    for (const category of RELEASE_CATEGORIES) {
      if (typeof releaseNotes.categories[category] !== 'string' || releaseNotes.categories[category].length === 0) {
        errors.push(`${prefix}.categories.${category} must be a non-empty string`);
      }
    }
  }
  for (const parts of RELEASE_UI_PATHS) {
    const value = readNested(releaseNotes, parts);
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${prefix}.${pathLabel(parts)} must be a non-empty string`);
    }
  }
  if (!isRecord(releaseNotes.releases)) {
    errors.push(`${prefix}.releases is missing`);
    return errors;
  }
  const expectedReleaseKeys = registry.releases.map((release) => releaseLocaleKey(release.version));
  if (!exactKeys(releaseNotes.releases, expectedReleaseKeys)) {
    errors.push(`${prefix}.releases must contain exactly ${expectedReleaseKeys.join(', ')}`);
  }
  for (const release of registry.releases) {
    const releaseKey = releaseLocaleKey(release.version);
    const localizedRelease = releaseNotes.releases[releaseKey];
    if (!isRecord(localizedRelease) || !exactKeys(localizedRelease, ['entries'])) {
      errors.push(`${prefix}.releases.${releaseKey} must contain exactly entries`);
      continue;
    }
    const expectedEntryIds = release.entries.map((entry) => entry.id);
    if (!exactKeys(localizedRelease.entries, expectedEntryIds)) {
      errors.push(
        `${prefix}.releases.${releaseKey}.entries must contain exactly ${expectedEntryIds.join(', ')}`,
      );
    }
    for (const entry of release.entries) {
      const localizedEntry = localizedRelease.entries[entry.id];
      if (!exactKeys(localizedEntry, ['title', 'description'])) {
        errors.push(`${prefix}.releases.${releaseKey}.entries.${entry.id} must contain exactly title and description`);
        continue;
      }
      for (const field of ['title', 'description']) {
        if (typeof localizedEntry[field] !== 'string' || localizedEntry[field].length === 0) {
          errors.push(`${prefix}.releases.${releaseKey}.entries.${entry.id}.${field} must be a non-empty string`);
        }
      }
    }
  }
  return errors;
};

export const renderChangelog = (registry, englishLocale) => {
  const releaseNotes = englishLocale.releaseNotes;
  const lines = [`# ${releaseNotes.changelog.title}`, '', releaseNotes.changelog.description, ''];
  for (const release of registry.releases) {
    const localizedRelease = releaseNotes.releases[releaseLocaleKey(release.version)];
    lines.push(`## ${release.version} — ${release.date}`, '', `${releaseNotes.changelog.releasedOn}: ${release.date}`, '');
    for (const category of RELEASE_CATEGORIES) {
      const entries = release.entries.filter((entry) => entry.category === category);
      if (entries.length === 0) continue;
      lines.push(`### ${releaseNotes.categories[category]}`, '');
      for (const entry of entries) {
        const localizedEntry = localizedRelease.entries[entry.id];
        lines.push(`- **${localizedEntry.title}** — ${localizedEntry.description}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').replace(/\n+$/u, '')}\n`;
};

const artifactPath = (filePath, kind) => {
  let candidate;
  do {
    candidate = `${filePath}.${kind}-${process.pid}-${Math.random().toString(16).slice(2)}`;
  } while (existsSync(candidate));
  return candidate;
};

const removeArtifact = (filePath) => {
  if (!filePath) return;
  try {
    unlinkSync(filePath);
  } catch {
    return;
  }
};

export const writeFilesAtomically = (files, { rename = renameSync } = {}) => {
  const replacements = [];
  try {
    for (const [filePath, content] of files) {
      const temporaryPath = artifactPath(filePath, 'tmp');
      const replacement = {
        filePath,
        temporaryPath,
        backupPath: undefined,
        backupCreated: false,
        replaced: false,
        originalContent: undefined,
      };
      replacements.push(replacement);
      const descriptor = openSync(temporaryPath, 'w');
      try {
        writeFileSync(descriptor, content, 'utf8');
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
      if (existsSync(filePath)) replacement.originalContent = readFileSync(filePath);
    }
    for (const replacement of replacements) {
      if (replacement.originalContent) {
        replacement.backupPath = artifactPath(replacement.filePath, 'backup');
        rename(replacement.filePath, replacement.backupPath);
        replacement.backupCreated = true;
      }
      rename(replacement.temporaryPath, replacement.filePath);
      replacement.temporaryPath = undefined;
      replacement.replaced = true;
    }
    for (const replacement of replacements) {
      removeArtifact(replacement.backupPath);
      replacement.backupPath = undefined;
      replacement.backupCreated = false;
    }
  } catch (error) {
    for (let index = replacements.length - 1; index >= 0; index -= 1) {
      const replacement = replacements[index];
      if (replacement.replaced) {
        removeArtifact(replacement.filePath);
        if (replacement.backupCreated) {
          try {
            rename(replacement.backupPath, replacement.filePath);
            replacement.backupCreated = false;
          } catch {
            if (replacement.originalContent) writeFileSync(replacement.filePath, replacement.originalContent);
          }
        } else if (replacement.originalContent) {
          writeFileSync(replacement.filePath, replacement.originalContent);
        }
      } else if (replacement.backupCreated) {
        try {
          rename(replacement.backupPath, replacement.filePath);
          replacement.backupCreated = false;
        } catch {
          if (replacement.originalContent) writeFileSync(replacement.filePath, replacement.originalContent);
        }
      }
    }
    for (const replacement of replacements) {
      removeArtifact(replacement.temporaryPath);
      removeArtifact(replacement.backupPath);
    }
    throw error;
  }
};

export const validateReleaseContract = ({ root = repositoryRoot, includeChangelog = true } = {}) => {
  const paths = getRepositoryPaths(root);
  const errors = [];
  let manifests;
  let registry;
  let englishLocale;
  let spanishLocale;
  try {
    manifests = [
      ['root package.json', readJson(paths.packageManifest)],
      ['apps/front/package.json', readJson(paths.frontManifest)],
      ['apps/back/package.json', readJson(paths.backManifest)],
    ];
  } catch (error) {
    return [`unable to read package manifest: ${error.message}`];
  }
  const versions = manifests.map(([label, manifest]) => {
    if (!isStableReleaseVersion(manifest.version)) errors.push(`${label}.version is not a stable SemVer: ${manifest.version}`);
    return manifest.version;
  });
  if (new Set(versions).size !== 1) errors.push(`package versions diverge: ${versions.join(', ')}`);
  try {
    registry = readJson(paths.registry);
    englishLocale = readJson(paths.englishLocale);
    spanishLocale = readJson(paths.spanishLocale);
  } catch (error) {
    return [...errors, `unable to read release contract data: ${error.message}`];
  }
  errors.push(...validateReleaseRegistry(registry));
  if (isStableReleaseVersion(versions[0]) && registry.currentVersion !== versions[0]) {
    errors.push(`registry.currentVersion ${registry.currentVersion} diverges from package version ${versions[0]}`);
  }
  errors.push(...validateLocale(englishLocale, registry, 'en'));
  errors.push(...validateLocale(spanishLocale, registry, 'es'));
  if (includeChangelog) {
    try {
      const actual = readFileSync(paths.changelog, 'utf8');
      const expected = renderChangelog(registry, englishLocale);
      if (actual !== expected) errors.push('CHANGELOG.md does not match generated English release data');
    } catch (error) {
      errors.push(`unable to verify CHANGELOG.md: ${error.message}`);
    }
  }
  return errors;
};
