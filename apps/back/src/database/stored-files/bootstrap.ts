import { DataSource } from 'typeorm';
import { loadDatabaseRuntimeConfig } from '../../config/database-runtime-config';
import { StoredFileCipher } from '../../shared/domain/stored-file-cipher.port';
import { createStoredFileCipher } from '../../shared/infrastructure/crypto/stored-file-cipher';
import { parseStoredFileKeyring } from '../../shared/infrastructure/crypto/stored-file-keyring';
import { StoredFileOperationError } from './stored-file-operation.error';

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

export interface StoredFilesRuntime {
  activeVersion: string;
  cipher: StoredFileCipher;
  dataSource: DataSource;
  knownKeyVersions: ReadonlySet<string>;
}

export function createStoredFilesRuntime(environment: Record<string, unknown>): StoredFilesRuntime {
  try {
    const databaseRuntimeConfig = loadDatabaseRuntimeConfig(environment);
    const keyring = parseStoredFileKeyring({
      activeVersion: environment.STORED_FILE_ACTIVE_KEY_VERSION,
      keys: environment.STORED_FILE_KEYS,
      environment: environment.NODE_ENV,
    });
    const dataSource = new DataSource({
      type: 'postgres',
      host: databaseRuntimeConfig.host,
      port: databaseRuntimeConfig.port,
      username: databaseRuntimeConfig.username,
      password: databaseRuntimeConfig.password,
      database: databaseRuntimeConfig.database,
      synchronize: false,
      migrationsRun: false,
      extra: {
        max: 1,
        idleTimeoutMillis: databaseRuntimeConfig.idleTimeoutMillis,
        connectionTimeoutMillis: databaseRuntimeConfig.connectionTimeoutMillis,
        statement_timeout: databaseRuntimeConfig.statementTimeoutMillis,
        query_timeout: databaseRuntimeConfig.queryTimeoutMillis,
        application_name: 'ledgerly-stored-files',
      },
    });
    return {
      activeVersion: keyring.activeVersion,
      cipher: createStoredFileCipher(keyring),
      dataSource,
      knownKeyVersions: new Set(keyring.keys.keys()),
    };
  } catch {
    throw new StoredFileOperationError();
  }
}

export function parseStoredFilesBatchSize(argv: readonly string[], environment: Record<string, unknown>): number {
  const batchSizeArguments = argv.filter((argument) => argument.startsWith('--batch-size='));
  if (batchSizeArguments.length !== argv.length || batchSizeArguments.length > 1) throw new StoredFileOperationError();
  const argumentValue = batchSizeArguments[0]?.slice('--batch-size='.length);
  if (argumentValue !== undefined && environment.STORED_FILES_BATCH_SIZE !== undefined) throw new StoredFileOperationError();
  const value = argumentValue ?? environment.STORED_FILES_BATCH_SIZE ?? DEFAULT_BATCH_SIZE;
  if (typeof value !== 'string' && typeof value !== 'number') throw new StoredFileOperationError();
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new StoredFileOperationError();
  const batchSize = Number(value);
  if (!Number.isSafeInteger(batchSize) || batchSize > MAX_BATCH_SIZE) throw new StoredFileOperationError();
  return batchSize;
}
