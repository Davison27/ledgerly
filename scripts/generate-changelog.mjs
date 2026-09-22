import {
  getRepositoryPaths,
  readJson,
  renderChangelog,
  validateLocale,
  validateReleaseRegistry,
  writeFilesAtomically,
} from './release-contract.mjs';

export const generateChangelog = ({ root } = {}) => {
  const paths = getRepositoryPaths(root);
  const registry = readJson(paths.registry);
  const englishLocale = readJson(paths.englishLocale);
  const registryErrors = validateReleaseRegistry(registry);
  const localeErrors = validateLocale(englishLocale, registry, 'en');
  if (registryErrors.length > 0 || localeErrors.length > 0) {
    throw new Error([...registryErrors, ...localeErrors].join('\n'));
  }
  const content = renderChangelog(registry, englishLocale);
  writeFilesAtomically([[paths.changelog, content]]);
  return content;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateChangelog();
    process.stdout.write('CHANGELOG.md generated.\n');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
