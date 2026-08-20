import { StoredFileAadDescriptor, StoredFileStore } from '../../domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { buildStoredFileAad } from './stored-file-aad';

function buildDescriptor(overrides: Partial<StoredFileAadDescriptor> = {}): StoredFileAadDescriptor {
  return {
    store: 'document',
    rowId: 'row-1',
    mimeType: null,
    plaintextSize: 42,
    ...overrides,
  };
}

describe('buildStoredFileAad', () => {
  it('builds the schema-v1 byte sequence with fixed fields and encodings', () => {
    const aad = buildStoredFileAad(buildDescriptor());

    expect(aad).toEqual(
      Buffer.from([
        0x01,
        0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x01, 0x01,
        0x02, 0x02, 0x01, 0x00, 0x00, 0x00, 0x05, 0x72, 0x6f, 0x77, 0x2d, 0x31,
        0x03, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x04, 0x03, 0x01, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a,
      ]),
    );
  });

  it('uses UTF-8 byte lengths instead of JavaScript character counts', () => {
    const aad = buildStoredFileAad(buildDescriptor({ rowId: 'café', mimeType: 'text/é' }));

    expect(aad.subarray(12, 16)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x05]));
    expect(aad.subarray(24, 28)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x07]));
  });

  it('keeps a null MIME distinct from a present empty MIME', () => {
    const nullMime = buildStoredFileAad(buildDescriptor({ mimeType: null }));
    const emptyMime = buildStoredFileAad(buildDescriptor({ mimeType: '' }));

    expect(nullMime).not.toEqual(emptyMime);
    expect(nullMime.subarray(23, 28)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]));
    expect(emptyMime.subarray(23, 28)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]));
  });

  it('keeps delimiter homophones and field swaps distinct', () => {
    const rowDelimiter = buildStoredFileAad(
      buildDescriptor({ rowId: 'row|image/png', mimeType: 'application/pdf' }),
    );
    const mimeDelimiter = buildStoredFileAad(
      buildDescriptor({ rowId: 'row', mimeType: 'image/png|application/pdf' }),
    );
    const swappedFields = buildStoredFileAad(
      buildDescriptor({ rowId: 'application/pdf', mimeType: 'row' }),
    );

    expect(rowDelimiter).not.toEqual(mimeDelimiter);
    expect(rowDelimiter).not.toEqual(swappedFields);
  });

  it.each([
    ['document', 0x01],
    ['staffDocument', 0x03],
    ['companyLogo', 0x04],
    ['projectImage', 0x05],
    ['productImage', 0x06],
  ] satisfies [StoredFileStore, number][])('uses the fixed %s store identifier', (store, code) => {
    const aad = buildStoredFileAad(buildDescriptor({ store }));

    expect(aad.subarray(1, 9)).toEqual(Buffer.from([0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x01, code]));
  });

  it.each([
    buildDescriptor({ store: 'unknown' as StoredFileStore }),
    buildDescriptor({ rowId: '' }),
    buildDescriptor({ rowId: '\ud800' }),
    buildDescriptor({ rowId: 'a'.repeat(129) }),
    buildDescriptor({ mimeType: 'a'.repeat(128) }),
    buildDescriptor({ plaintextSize: -1 }),
    buildDescriptor({ plaintextSize: 1.5 }),
    buildDescriptor({ plaintextSize: Number.MAX_SAFE_INTEGER + 1 }),
    buildDescriptor({ plaintextSize: 10 * 1024 * 1024 + 1 }),
  ])('rejects invalid descriptor bounds before encoding', (descriptor) => {
    expect(() => buildStoredFileAad(descriptor)).toThrow(StoredFileCryptographyException);
  });
});
