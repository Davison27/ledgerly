import { reportMigrationFailure } from './migration-error';

export async function runMigrationCli(
  run: () => Promise<void>,
  reportFailure: (error: unknown) => void = reportMigrationFailure,
): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    reportFailure(error);
    process.exitCode = 1;
  }
}
