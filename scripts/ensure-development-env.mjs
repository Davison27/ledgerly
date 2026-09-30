import { randomBytes } from 'node:crypto';
import { access, link, open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

const ensureDevelopmentEnv = async () => {
  const environmentPath = path.join(repositoryRoot, 'apps/back/.env');
  const examplePath = path.join(repositoryRoot, 'apps/back/.env.example');

  try {
    await access(environmentPath);
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const example = await readFile(examplePath, 'utf8');
  const passwordLines = example.match(/^DB_PASSWORD=.*$/gm) ?? [];
  if (passwordLines.length !== 1) {
    throw new Error('The development environment template must contain one DB_PASSWORD entry.');
  }

  const random = randomBytes(48);
  const password = random.subarray(16).toString('hex');
  const environment = example.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${password}`);
  const temporaryPath = path.join(
    path.dirname(environmentPath),
    `.env.${random.subarray(0, 16).toString('hex')}.tmp`,
  );
  let file;
  let ownsTemporaryFile = false;

  try {
    file = await open(temporaryPath, 'wx', 0o600);
    ownsTemporaryFile = true;
    await file.writeFile(environment, 'utf8');
    await file.chmod(0o600);
    await file.close();
    file = undefined;

    try {
      await link(temporaryPath, environmentPath);
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') return false;
      throw error;
    }
  } finally {
    try {
      await file?.close();
    } finally {
      if (ownsTemporaryFile) await unlink(temporaryPath);
    }
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const created = await ensureDevelopmentEnv();
    if (created) process.stdout.write('Created apps/back/.env from .env.example.\n');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
