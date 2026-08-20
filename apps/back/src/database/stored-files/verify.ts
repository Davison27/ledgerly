import { DataSource } from 'typeorm';
import { StoredFileCipher } from '../../shared/domain/stored-file-cipher.port';
import { STORED_FILE_STORES, StoredFileStoreDescriptor } from './store-registry';
import { envelopePresenceSql, readStoredFileRecord, storedFileSelectColumns } from './stored-file-record';
import { StoredFileOperationError } from './stored-file-operation.error';

export type StoredFilesVerificationResult =
  | 'ok'
  | 'partial'
  | 'malformed'
  | 'unknown-key-version'
  | 'tampered-or-wrong-key'
  | 'retired-version';

export interface StoredFilesVerificationCount {
  keyVersion: string;
  result: StoredFilesVerificationResult;
  store: string;
  count: number;
}

export interface StoredFilesVerificationSummary {
  counts: StoredFilesVerificationCount[];
  valid: boolean;
}

export interface StoredFilesVerifyOptions {
  activeVersion: string;
  batchSize: number;
  knownKeyVersions: ReadonlySet<string>;
  stores?: readonly StoredFileStoreDescriptor[];
}

export async function verifyStoredFiles(
  dataSource: DataSource,
  cipher: StoredFileCipher,
  options: StoredFilesVerifyOptions,
): Promise<StoredFilesVerificationSummary> {
  try {
    const counts = new Map<string, StoredFilesVerificationCount>();
    for (const store of options.stores ?? STORED_FILE_STORES) {
      let cursor: string | null = null;
      let hasMore = true;
      while (hasMore) {
        const queryResult: unknown = await dataSource.query(buildVerifyQuery(store), [cursor, options.batchSize]);
        if (!Array.isArray(queryResult)) throw new StoredFileOperationError();
        const rows: unknown[] = queryResult;
        for (const row of rows) {
          const parsed = readStoredFileRecord(row, store);
          const result = verifyRecord(parsed, cipher, options);
          addCount(counts, store.name, parsed.version, result);
          cursor = parsed.record?.id ?? readRowId(row);
          if (cursor === null) throw new StoredFileOperationError();
        }
        hasMore = rows.length >= options.batchSize;
      }
    }
    const sortedCounts = [...counts.values()].sort(
      (left, right) =>
        left.store.localeCompare(right.store) ||
        left.keyVersion.localeCompare(right.keyVersion) ||
        left.result.localeCompare(right.result),
    );
    return { counts: sortedCounts, valid: sortedCounts.every((count) => count.result === 'ok') };
  } catch (error) {
    if (error instanceof StoredFileOperationError) throw error;
    throw new StoredFileOperationError();
  }
}

function verifyRecord(
  parsed: ReturnType<typeof readStoredFileRecord>,
  cipher: StoredFileCipher,
  options: StoredFilesVerifyOptions,
): StoredFilesVerificationResult {
  if (parsed.state === 'partial') return 'partial';
  if (parsed.state === 'malformed' || !parsed.record) return 'malformed';
  if (!options.knownKeyVersions.has(parsed.record.envelope.version)) return 'unknown-key-version';
  try {
    cipher.decrypt(parsed.record.envelope, parsed.record.descriptor);
  } catch {
    return 'tampered-or-wrong-key';
  }
  return parsed.record.envelope.version === options.activeVersion ? 'ok' : 'retired-version';
}

function addCount(
  counts: Map<string, StoredFilesVerificationCount>,
  store: string,
  keyVersion: string,
  result: StoredFilesVerificationResult,
): void {
  const key = `${store}\u0000${keyVersion}\u0000${result}`;
  const current = counts.get(key);
  if (current) {
    current.count += 1;
    return;
  }
  counts.set(key, { store, keyVersion, result, count: 1 });
}

export function buildVerifyQuery(store: StoredFileStoreDescriptor): string {
  return `SELECT ${storedFileSelectColumns(store)} FROM "${store.table}" WHERE (${envelopePresenceSql(store)}) AND ($1::uuid IS NULL OR "id" > $1::uuid) ORDER BY "id" ASC LIMIT $2`;
}

function readRowId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
}
