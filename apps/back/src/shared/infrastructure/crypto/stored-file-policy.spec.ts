import { StoredFileStore } from '../../domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { assertStoredFilePlaintextSize, getStoredFilePlaintextLimit } from './stored-file-policy';

describe('stored file plaintext policy', () => {
  it.each([
    ['document', 10 * 1024 * 1024],
    ['invoicePdf', 10 * 1024 * 1024],
    ['staffDocument', 10 * 1024 * 1024],
    ['companyLogo', 2 * 1024 * 1024],
    ['projectImage', 2 * 1024 * 1024],
    ['productImage', 2 * 1024 * 1024],
  ] satisfies [StoredFileStore, number][])('sets the %s plaintext limit to %d bytes', (store, limit) => {
    expect(getStoredFilePlaintextLimit(store)).toBe(limit);
    expect(() => assertStoredFilePlaintextSize(store, limit)).not.toThrow();
  });

  it.each([
    'document',
    'invoicePdf',
    'staffDocument',
    'companyLogo',
    'projectImage',
    'productImage',
  ] satisfies StoredFileStore[])('rejects one byte over the %s limit', (store) => {
    expect(() => assertStoredFilePlaintextSize(store, getStoredFilePlaintextLimit(store) + 1)).toThrow(
      StoredFileCryptographyException,
    );
  });
});
