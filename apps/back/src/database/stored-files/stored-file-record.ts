import { StoredFileAadDescriptor, StoredFileEnvelope } from '../../shared/domain/stored-file-cipher.port';
import { buildStoredFileAad } from '../../shared/infrastructure/crypto/stored-file-aad';
import { isStoredFileKeyVersion } from '../../shared/infrastructure/crypto/stored-file-keyring';
import { StoredFileStoreDescriptor } from './store-registry';

export type StoredFileRecordState = 'complete' | 'malformed' | 'partial';

export interface StoredFileRecord {
  descriptor: StoredFileAadDescriptor;
  envelope: StoredFileEnvelope;
  id: string;
}

export function readStoredFileRecord(row: unknown, store: StoredFileStoreDescriptor): {
  state: StoredFileRecordState;
  record?: StoredFileRecord;
  version: string;
} {
  if (!isRecord(row)) return { state: 'malformed', version: 'invalid' };

  const version = typeof row.keyVersion === 'string' ? row.keyVersion : 'invalid';
  const envelopeValues = [row.ciphertext, row.nonce, row.tag, row.keyVersion];
  if (envelopeValues.some((value) => value === null || value === undefined)) {
    return { state: 'partial', version };
  }
  if (row.size === null || row.size === undefined) return { state: 'partial', version };
  if (store.mimeTypeColumn && (row.mimeType === null || row.mimeType === undefined)) {
    return { state: 'partial', version };
  }

  const mimeType = store.mimeType ?? row.mimeType;
  if (typeof mimeType !== 'string' || !isStoredFileKeyVersion(row.keyVersion) || !Buffer.isBuffer(row.ciphertext)) {
    return { state: 'malformed', version };
  }
  if (!Buffer.isBuffer(row.nonce) || !Buffer.isBuffer(row.tag) || !isPlaintextSize(row.size)) {
    return { state: 'malformed', version };
  }
  if (row.ciphertext.length !== row.size || row.nonce.length !== 12 || row.tag.length !== 16) {
    return { state: 'malformed', version };
  }
  if (typeof row.id !== 'string') return { state: 'malformed', version };

  const descriptor = { store: store.name, rowId: row.id, mimeType, plaintextSize: row.size };
  try {
    buildStoredFileAad(descriptor);
  } catch {
    return { state: 'malformed', version };
  }

  return {
    state: 'complete',
    version,
    record: {
      id: row.id,
      descriptor,
      envelope: {
        version: row.keyVersion,
        ciphertext: Buffer.from(row.ciphertext),
        nonce: Buffer.from(row.nonce),
        tag: Buffer.from(row.tag),
      },
    },
  };
}

export function envelopePresenceSql(store: StoredFileStoreDescriptor): string {
  return envelopeColumns(store).map((column) => `"${column}" IS NOT NULL`).join(' OR ');
}

export function envelopeColumns(store: StoredFileStoreDescriptor): string[] {
  const columns = [store.ciphertextColumn, store.nonceColumn, store.tagColumn, store.keyVersionColumn];
  if (store.envelopeMetadata && store.mimeTypeColumn) columns.push(store.mimeTypeColumn, store.sizeColumn);
  return columns;
}

export function storedFileSelectColumns(store: StoredFileStoreDescriptor): string {
  const columns = [
    `"id" AS "id"`,
    `"${store.ciphertextColumn}" AS "ciphertext"`,
    `"${store.nonceColumn}" AS "nonce"`,
    `"${store.tagColumn}" AS "tag"`,
    `"${store.keyVersionColumn}" AS "keyVersion"`,
    `"${store.sizeColumn}" AS "size"`,
  ];
  if (store.mimeTypeColumn) columns.push(`"${store.mimeTypeColumn}" AS "mimeType"`);
  return columns.join(', ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlaintextSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
