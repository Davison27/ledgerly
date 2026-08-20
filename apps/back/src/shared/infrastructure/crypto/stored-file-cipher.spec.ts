import { StoredFileAadDescriptor, StoredFileEnvelope, StoredFileStore } from '../../domain/stored-file-cipher.port';
import { StoredFileConfigurationException } from '../../domain/errors/stored-file-configuration.exception';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { createStoredFileCipher } from './stored-file-cipher';
import { parseStoredFileKeyring, StoredFileKeyring } from './stored-file-keyring';
import { getStoredFilePlaintextLimit } from './stored-file-policy';

const primaryKey = Buffer.alloc(32, 0x11).toString('base64');
const secondaryKey = Buffer.alloc(32, 0x22).toString('base64');

function buildCipher(generateRandomBytes?: (size: number) => Buffer) {
  return createStoredFileCipher(
    parseStoredFileKeyring({
      activeVersion: 'v1',
      keys: JSON.stringify({ v1: primaryKey, v2: secondaryKey }),
      environment: 'test',
    }),
    generateRandomBytes,
  );
}

function buildDescriptor(store: StoredFileStore, plaintext: Buffer): StoredFileAadDescriptor {
  return {
    store,
    rowId: `${store}-row`,
    mimeType: store.endsWith('Image') || store === 'companyLogo' ? 'image/png' : 'application/pdf',
    plaintextSize: plaintext.length,
  };
}

function cloneEnvelope(envelope: StoredFileEnvelope): StoredFileEnvelope {
  return {
    version: envelope.version,
    nonce: Buffer.from(envelope.nonce),
    tag: Buffer.from(envelope.tag),
    ciphertext: Buffer.from(envelope.ciphertext),
  };
}

const descriptorTransforms: Array<(descriptor: StoredFileAadDescriptor) => StoredFileAadDescriptor> = [
  (descriptor) => ({ ...descriptor, rowId: 'another-row' }),
  (descriptor) => ({ ...descriptor, mimeType: 'application/octet-stream' }),
  (descriptor) => ({ ...descriptor, rowId: descriptor.mimeType ?? 'mime', mimeType: descriptor.rowId }),
  (descriptor) => ({ ...descriptor, plaintextSize: descriptor.plaintextSize - 1 }),
];

describe('stored file cipher', () => {
  it.each([
    'document',
    'staffDocument',
    'companyDocument',
    'companyLogo',
    'projectImage',
    'productImage',
  ] satisfies StoredFileStore[])('round-trips %s plaintext with a versioned AES-GCM envelope', (store) => {
    const randomBytes = jest.fn((size: number) => Buffer.alloc(size, 0x11));
    const cipher = buildCipher(randomBytes);
    const plaintext = Buffer.from(`authenticated ${store}`);
    const descriptor = buildDescriptor(store, plaintext);

    const envelope = cipher.encrypt(plaintext, descriptor);

    expect(envelope.version).toBe('v1');
    expect(envelope.nonce).toHaveLength(12);
    expect(envelope.tag).toHaveLength(16);
    expect(envelope.ciphertext).toHaveLength(plaintext.length);
    expect(cipher.decrypt(envelope, descriptor)).toEqual(plaintext);
  });

  it('generates a unique nonce for each encryption', () => {
    const cipher = buildCipher();
    const plaintext = Buffer.from('nonce uniqueness');
    const descriptor = buildDescriptor('document', plaintext);

    const first = cipher.encrypt(plaintext, descriptor);
    const second = cipher.encrypt(plaintext, descriptor);

    expect(first.nonce).not.toEqual(second.nonce);
  });

  it.each([
    'document',
    'staffDocument',
    'companyDocument',
    'companyLogo',
    'projectImage',
    'productImage',
  ] satisfies StoredFileStore[])('round-trips %s plaintext at its registered limit', (store) => {
    const cipher = buildCipher();
    const plaintext = Buffer.alloc(getStoredFilePlaintextLimit(store), 0x61);
    const descriptor = buildDescriptor(store, plaintext);
    const decrypted = cipher.decrypt(cipher.encrypt(plaintext, descriptor), descriptor);

    expect(Buffer.compare(decrypted, plaintext)).toBe(0);
  });

  it.each(['nonce', 'tag', 'ciphertext'] as const)('rejects tampered %s without exposing crypto details', (component) => {
    const cipher = buildCipher();
    const plaintext = Buffer.from('tamper proof');
    const descriptor = buildDescriptor('document', plaintext);
    const envelope = cloneEnvelope(cipher.encrypt(plaintext, descriptor));
    envelope[component][0] ^= 0x01;

    expect(() => cipher.decrypt(envelope, descriptor)).toThrow(StoredFileCryptographyException);
    expect(() => cipher.decrypt(envelope, descriptor)).toThrow('Stored file could not be processed');
  });

  it.each([
    (envelope: StoredFileEnvelope) => ({ ...envelope, version: 'v9' }),
    (envelope: StoredFileEnvelope) => ({ ...envelope, nonce: Buffer.alloc(11) }),
    (envelope: StoredFileEnvelope) => ({ ...envelope, tag: Buffer.alloc(15) }),
    (envelope: StoredFileEnvelope) => ({ ...envelope, ciphertext: Buffer.alloc(envelope.ciphertext.length + 1) }),
  ])('rejects malformed or unknown envelopes', (mutateEnvelope) => {
    const cipher = buildCipher();
    const plaintext = Buffer.from('malformed envelope');
    const descriptor = buildDescriptor('document', plaintext);

    expect(() => cipher.decrypt(mutateEnvelope(cipher.encrypt(plaintext, descriptor)), descriptor)).toThrow(
      StoredFileCryptographyException,
    );
  });

  it('rejects the same envelope with a wrong retained key', () => {
    const plaintext = Buffer.from('wrong key');
    const descriptor = buildDescriptor('document', plaintext);
    const envelope = buildCipher().encrypt(plaintext, descriptor);
    const wrongKeyCipher = createStoredFileCipher(
      parseStoredFileKeyring({
        activeVersion: 'v1',
        keys: JSON.stringify({ v1: secondaryKey }),
        environment: 'test',
      }),
    );

    expect(() => wrongKeyCipher.decrypt(envelope, descriptor)).toThrow(StoredFileCryptographyException);
  });

  it.each(descriptorTransforms)('rejects envelopes transplanted across authenticated descriptor fields', (mutateDescriptor) => {
    const cipher = buildCipher();
    const plaintext = Buffer.from('descriptor transplant');
    const descriptor = buildDescriptor('document', plaintext);
    const envelope = cipher.encrypt(plaintext, descriptor);

    expect(() => cipher.decrypt(envelope, mutateDescriptor(descriptor))).toThrow(StoredFileCryptographyException);
  });

  it('rejects oversized plaintext before requesting randomness', () => {
    const plaintext = Buffer.alloc(getStoredFilePlaintextLimit('document') + 1);
    const descriptor = buildDescriptor('document', plaintext);
    const randomBytes = jest.fn((size: number) => Buffer.alloc(size, 0x11));
    const cipherWithTrackedRandomness = buildCipher(randomBytes);

    expect(() => cipherWithTrackedRandomness.encrypt(plaintext, descriptor)).toThrow(StoredFileCryptographyException);
    expect(randomBytes).not.toHaveBeenCalled();
  });

  it('snapshots every retained key before caller mutations', () => {
    const keyring = parseStoredFileKeyring({
      activeVersion: 'v1',
      keys: JSON.stringify({ v1: primaryKey, v2: secondaryKey }),
      environment: 'test',
    });
    const cipher = createStoredFileCipher(keyring);
    const v2Cipher = createStoredFileCipher(
      parseStoredFileKeyring({
        activeVersion: 'v2',
        keys: JSON.stringify({ v1: primaryKey, v2: secondaryKey }),
        environment: 'test',
      }),
    );
    const plaintext = Buffer.from('keyring snapshot');
    const descriptor = buildDescriptor('document', plaintext);
    const v1Envelope = cipher.encrypt(plaintext, descriptor);
    const v2Envelope = v2Cipher.encrypt(plaintext, descriptor);
    const mutableKeys = keyring.keys as Map<string, Buffer>;

    mutableKeys.get('v1')?.fill(0x33);
    mutableKeys.get('v2')?.fill(0x44);
    mutableKeys.set('v3', Buffer.alloc(32, 0x55));
    mutableKeys.delete('v2');

    expect(cipher.decrypt(v1Envelope, descriptor)).toEqual(plaintext);
    expect(cipher.decrypt(v2Envelope, descriptor)).toEqual(plaintext);
    expect(cipher.decrypt(cipher.encrypt(plaintext, descriptor), descriptor)).toEqual(plaintext);
  });

  it.each([
    new Map<string, Buffer>([
      ['v1', Buffer.alloc(32, 0x11)],
      ['v2', Buffer.alloc(31, 0x22)],
    ]),
    new Map<string, Buffer>([
      ['v1', Buffer.alloc(32, 0x11)],
      ['invalid', Buffer.alloc(32, 0x22)],
    ]),
  ])('rejects malformed retained keyring entries', (keys) => {
    const malformedKeyring: StoredFileKeyring = { activeVersion: 'v1', keys };

    expect(() => createStoredFileCipher(malformedKeyring)).toThrow(StoredFileConfigurationException);
  });

  it('normalizes random source failures without exposing their message', () => {
    const cipher = buildCipher(() => {
      throw new Error('sensitive random source failure');
    });
    const plaintext = Buffer.from('randomness failure');
    const descriptor = buildDescriptor('document', plaintext);

    expect(() => cipher.encrypt(plaintext, descriptor)).toThrow(StoredFileCryptographyException);
    expect(() => cipher.encrypt(plaintext, descriptor)).toThrow('Stored file could not be processed');
  });
});
