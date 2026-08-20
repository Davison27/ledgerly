import { createStoredFileCipher } from './stored-file-cipher';
import { decryptStoredImage, encryptStoredImage } from './stored-image-envelope';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';

const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const image = `data:image/png;base64,${png.toString('base64')}`;

function createCipher(keyByte = 1) {
  return createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, keyByte)]]),
  });
}

describe('stored image envelope', () => {
  it('encrypts decoded bytes and reconstructs the canonical data URL', () => {
    const cipher = createCipher();
    const encrypted = encryptStoredImage(image, 'projectImage', 'project-1', cipher);

    expect(encrypted.envelope.ciphertext).not.toEqual(png);
    expect(
      decryptStoredImage(encrypted.envelope, 'projectImage', 'project-1', cipher),
    ).toBe(image);
  });

  it.each([
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, ciphertext: null }),
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, nonce: null }),
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, tag: null }),
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, keyVersion: null }),
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, mimeType: null }),
    (envelope: ReturnType<typeof encryptStoredImage>['envelope']) => ({ ...envelope, size: null }),
  ])('rejects a partial image envelope', (mutateEnvelope) => {
    const cipher = createCipher();
    const encrypted = encryptStoredImage(image, 'equipmentImage', 'equipment-1', cipher);

    expect(() => decryptStoredImage(mutateEnvelope(encrypted.envelope), 'equipmentImage', 'equipment-1', cipher)).toThrow(
      StoredFileCryptographyException,
    );
  });

  it('fails closed for tamper, metadata, store, row, and key substitution', () => {
    const cipher = createCipher();
    const encrypted = encryptStoredImage(image, 'companyLogo', 'company-1', cipher);
    const tampered = { ...encrypted.envelope, ciphertext: Buffer.from(encrypted.envelope.ciphertext as Buffer) };
    (tampered.ciphertext as Buffer)[0] ^= 1;

    expect(() => decryptStoredImage(tampered, 'companyLogo', 'company-1', cipher)).toThrow(StoredFileCryptographyException);
    expect(() => decryptStoredImage(encrypted.envelope, 'companyLogo', 'company-2', cipher)).toThrow(StoredFileCryptographyException);
    expect(() => decryptStoredImage(encrypted.envelope, 'projectImage', 'company-1', cipher)).toThrow(StoredFileCryptographyException);
    expect(() => decryptStoredImage({ ...encrypted.envelope, mimeType: 'image/jpeg' }, 'companyLogo', 'company-1', cipher)).toThrow(
      StoredFileCryptographyException,
    );
    expect(() => decryptStoredImage(encrypted.envelope, 'companyLogo', 'company-1', createCipher(2))).toThrow(
      StoredFileCryptographyException,
    );
  });

  it('clears every value for a null image', () => {
    expect(encryptStoredImage(null, 'companyLogo', 'company-1', createCipher()).envelope).toEqual({
      ciphertext: null,
      keyVersion: null,
      mimeType: null,
      nonce: null,
      size: null,
      tag: null,
    });
  });
});
