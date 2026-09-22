import { validateReleaseContract } from './release-contract.mjs';

export { validateReleaseContract };

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateReleaseContract();
  if (errors.length > 0) {
    process.stderr.write(`${errors.map((error) => `Release contract: ${error}`).join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Release contract verification passed.\n');
  }
}
