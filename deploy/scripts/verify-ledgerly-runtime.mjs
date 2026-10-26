import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const forbiddenPackages = new Set(['vitest', '@vitest/mocker', 'tinypool']);
const requiredMulterVersion = '2.5.0';

const isWithin = (root, candidate) => {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath));
};

const readPackageManifest = async (entryPath, expectedName, nodeModulesRoot) => {
  let directory = dirname(await realpath(entryPath));

  while (isWithin(nodeModulesRoot, directory)) {
    const manifestPath = join(directory, 'package.json');

    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      if (manifest.name === expectedName) return manifest;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(`Could not find ${expectedName} package metadata inside the runtime node_modules tree.`);
};

const findForbiddenPackages = async (nodeModulesRoot) => {
  const found = [];
  const visitedDirectories = new Set();

  const visit = async (directory) => {
    const realDirectory = await realpath(directory);
    if (!isWithin(nodeModulesRoot, realDirectory) || visitedDirectories.has(realDirectory)) return;
    visitedDirectories.add(realDirectory);

    for (const entry of await readdir(realDirectory, { withFileTypes: true })) {
      const entryPath = join(realDirectory, entry.name);

      if (entry.name === 'package.json' && (entry.isFile() || entry.isSymbolicLink())) {
        const manifestPath = await realpath(entryPath);
        if (!isWithin(nodeModulesRoot, manifestPath)) {
          throw new Error(`Package metadata escapes the runtime node_modules tree: ${entryPath}`);
        }
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (forbiddenPackages.has(manifest.name)) {
          found.push({ name: manifest.name, version: manifest.version, path: relative(nodeModulesRoot, realDirectory) });
        }
      } else if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isSymbolicLink()) {
        const target = await realpath(entryPath);
        if (!isWithin(nodeModulesRoot, target)) {
          throw new Error(`Runtime dependency escapes node_modules: ${entryPath}`);
        }
        if ((await stat(target)).isDirectory()) await visit(target);
      }
    }
  };

  await visit(nodeModulesRoot);
  return found;
};

export const verifyRuntimeInventory = async (appRoot) => {
  const nodeModulesRoot = await realpath(join(appRoot, 'node_modules'));
  const rootRequire = createRequire(join(appRoot, 'package.json'));
  const forbidden = await findForbiddenPackages(nodeModulesRoot);

  if (forbidden.length > 0) {
    const packageNames = [...new Set(forbidden.map(({ name }) => name))].sort();
    throw new Error(`Forbidden test packages are present in the production image: ${packageNames.join(', ')}`);
  }

  const rootMulterEntry = rootRequire.resolve('multer');
  const rootMulter = await readPackageManifest(rootMulterEntry, 'multer', nodeModulesRoot);
  const adapterEntry = rootRequire.resolve('@nestjs/platform-express');
  const adapterRequire = createRequire(adapterEntry);
  const adapterMulterEntry = adapterRequire.resolve('multer');
  const adapterMulter = await readPackageManifest(adapterMulterEntry, 'multer', nodeModulesRoot);

  if (rootMulter.version !== requiredMulterVersion || adapterMulter.version !== requiredMulterVersion) {
    throw new Error(
      `Expected Multer ${requiredMulterVersion} in root and Nest adapter contexts; found ${rootMulter.version} and ${adapterMulter.version}.`,
    );
  }

  return {
    forbiddenPackages: forbidden.length,
    rootMulterVersion: rootMulter.version,
    adapterMulterVersion: adapterMulter.version,
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await verifyRuntimeInventory(resolve(process.argv[2] ?? '/app'));
    process.stdout.write(
      `Runtime inventory passed: ${result.forbiddenPackages} forbidden packages; root Multer ${result.rootMulterVersion}; Nest adapter Multer ${result.adapterMulterVersion}.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
