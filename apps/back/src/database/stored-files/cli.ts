import { createStoredFilesRuntime, parseStoredFilesBatchSize } from './bootstrap';
import { rekeyStoredFiles } from './rekey';
import { StoredFileOperationError } from './stored-file-operation.error';
import { verifyStoredFiles } from './verify';

export type StoredFilesCommand = 'rekey' | 'verify';

export interface StoredFilesCommandOutcome {
  output: string;
  success: boolean;
}

export async function runStoredFilesCommand(
  command: StoredFilesCommand,
  argv: readonly string[],
  environment: Record<string, unknown>,
): Promise<StoredFilesCommandOutcome> {
  const runtime = createStoredFilesRuntime(environment);
  try {
    const batchSize = parseStoredFilesBatchSize(argv, environment);
    await runtime.dataSource.initialize();
    if (command === 'rekey') {
      const result = await rekeyStoredFiles(runtime.dataSource, runtime.cipher, {
        activeVersion: runtime.activeVersion,
        batchSize,
      });
      return { output: `stored-files rekey batches=${result.batches} rows=${result.rows}\n`, success: true };
    }
    const summary = await verifyStoredFiles(runtime.dataSource, runtime.cipher, {
      activeVersion: runtime.activeVersion,
      batchSize,
      knownKeyVersions: runtime.knownKeyVersions,
    });
    const counts = summary.counts
      .map((count) => `store=${count.store} keyVersion=${count.keyVersion} result=${count.result} count=${count.count}`)
      .join('\n');
    if (!summary.valid) {
      return { output: counts.length === 0 ? '' : `${counts}\n`, success: false };
    }
    return { output: counts.length === 0 ? 'stored-files verify ok\n' : `${counts}\nstored-files verify ok\n`, success: true };
  } catch (error) {
    if (error instanceof StoredFileOperationError) throw error;
    throw new StoredFileOperationError();
  } finally {
    if (runtime.dataSource.isInitialized) await runtime.dataSource.destroy();
  }
}

export async function main(command: StoredFilesCommand, argv = process.argv.slice(2)): Promise<void> {
  const environment = { ...process.env };
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const outcome = await runStoredFilesCommand(command, argv, environment);
    if (interrupted) throw new StoredFileOperationError();
    process.stdout.write(outcome.output);
    if (!outcome.success) throw new StoredFileOperationError();
  } catch {
    process.stderr.write('Stored file operation failed\n');
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}
