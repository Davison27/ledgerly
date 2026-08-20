import { DataSource, EntityManager } from 'typeorm';
import { StoredFileCipher } from '../../shared/domain/stored-file-cipher.port';
import { STORED_FILE_STORES, StoredFileStoreDescriptor } from './store-registry';
import { envelopePresenceSql, readStoredFileRecord, storedFileSelectColumns } from './stored-file-record';
import { StoredFileOperationError } from './stored-file-operation.error';

export interface StoredFilesRekeyOptions {
  activeVersion: string;
  batchSize: number;
  stores?: readonly StoredFileStoreDescriptor[];
}

export interface StoredFilesRekeyResult {
  batches: number;
  rows: number;
}

export async function rekeyStoredFiles(
  dataSource: DataSource,
  cipher: StoredFileCipher,
  options: StoredFilesRekeyOptions,
): Promise<StoredFilesRekeyResult> {
  try {
    const stores = options.stores ?? STORED_FILE_STORES;
    let batches = 0;
    let rows = 0;
    let claimed: number;

    do {
      claimed = 0;
      for (const store of stores) {
        const claimedInBatch = await dataSource.transaction((manager) =>
          rekeyStoreBatch(manager, cipher, store, options.activeVersion, options.batchSize),
        );
        if (claimedInBatch > 0) batches += 1;
        claimed += claimedInBatch;
        rows += claimedInBatch;
      }
    } while (claimed > 0);

    return { batches, rows };
  } catch {
    throw new StoredFileOperationError();
  }
}

async function rekeyStoreBatch(
  manager: EntityManager,
  cipher: StoredFileCipher,
  store: StoredFileStoreDescriptor,
  activeVersion: string,
  batchSize: number,
): Promise<number> {
  const queryResult: unknown = await manager.query(buildClaimQuery(store), [activeVersion, batchSize]);
  if (!Array.isArray(queryResult)) throw new StoredFileOperationError();
  const rows: unknown[] = queryResult;

  for (const row of rows) {
    const parsed = readStoredFileRecord(row, store);
    if (parsed.state !== 'complete' || !parsed.record || parsed.version === activeVersion) {
      throw new StoredFileOperationError();
    }

    const plaintext = cipher.decrypt(parsed.record.envelope, parsed.record.descriptor);
    const replacement = cipher.encrypt(plaintext, parsed.record.descriptor);
    if (replacement.version !== activeVersion || Buffer.compare(replacement.nonce, parsed.record.envelope.nonce) === 0) {
      throw new StoredFileOperationError();
    }
    const replacementPlaintext = cipher.decrypt(replacement, parsed.record.descriptor);
    if (Buffer.compare(plaintext, replacementPlaintext) !== 0) throw new StoredFileOperationError();

    const updateResult: unknown = await manager.query(buildUpdateQuery(store), [
      replacement.ciphertext,
      replacement.nonce,
      replacement.tag,
      replacement.version,
      parsed.record.id,
      parsed.record.envelope.version,
      parsed.record.envelope.ciphertext,
      parsed.record.envelope.nonce,
      parsed.record.envelope.tag,
    ]);
    if (!Array.isArray(updateResult) || updateResult.length !== 1) throw new StoredFileOperationError();
  }

  return rows.length;
}

export function buildClaimQuery(store: StoredFileStoreDescriptor): string {
  return `SELECT ${storedFileSelectColumns(store)} FROM "${store.table}" WHERE (${envelopePresenceSql(store)}) AND "${store.keyVersionColumn}" IS DISTINCT FROM $1 ORDER BY "id" ASC LIMIT $2 FOR UPDATE SKIP LOCKED`;
}

function buildUpdateQuery(store: StoredFileStoreDescriptor): string {
  return `UPDATE "${store.table}" SET "${store.ciphertextColumn}" = $1, "${store.nonceColumn}" = $2, "${store.tagColumn}" = $3, "${store.keyVersionColumn}" = $4 WHERE "id" = $5 AND "${store.keyVersionColumn}" = $6 AND "${store.ciphertextColumn}" = $7 AND "${store.nonceColumn}" = $8 AND "${store.tagColumn}" = $9 RETURNING "id"`;
}
