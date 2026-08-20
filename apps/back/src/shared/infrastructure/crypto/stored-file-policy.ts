import { StoredFileStore } from '../../domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';

const MEBIBYTE = 1024 * 1024;

export const STORED_FILE_PLAINTEXT_LIMITS: Readonly<Record<StoredFileStore, number>> = {
  document: 10 * MEBIBYTE,
  staffDocument: 10 * MEBIBYTE,
  companyDocument: 10 * MEBIBYTE,
  companyLogo: 2 * MEBIBYTE,
  projectImage: 2 * MEBIBYTE,
  productImage: 2 * MEBIBYTE,
};

export function getStoredFilePlaintextLimit(store: StoredFileStore): number {
  const limit = STORED_FILE_PLAINTEXT_LIMITS[store];
  if (limit === undefined) {
    throw new StoredFileCryptographyException();
  }
  return limit;
}

export function assertStoredFilePlaintextSize(store: StoredFileStore, plaintextSize: number): void {
  if (!Number.isSafeInteger(plaintextSize) || plaintextSize < 0 || plaintextSize > getStoredFilePlaintextLimit(store)) {
    throw new StoredFileCryptographyException();
  }
}
