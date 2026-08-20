import {
  StoredFileCipher,
  StoredFileEnvelope,
} from '../../domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import {
  CanonicalImageDataUrl,
  ImageMimeType,
  ImageStoredFileStore,
  parseCanonicalImageDataUrl,
  serializeCanonicalImageDataUrl,
} from './image-data-url';

export interface StoredImageEnvelope {
  ciphertext: Buffer | null | undefined;
  keyVersion: string | null | undefined;
  mimeType: string | null | undefined;
  nonce: Buffer | null | undefined;
  size: number | null | undefined;
  tag: Buffer | null | undefined;
}

export function encryptStoredImage(
  image: string | null,
  store: ImageStoredFileStore,
  rowId: string,
  storedFileCipher: StoredFileCipher,
): { image: CanonicalImageDataUrl | null; envelope: StoredImageEnvelope } {
  if (image === null) {
    return { image: null, envelope: emptyStoredImageEnvelope() };
  }

  const parsed = parseCanonicalImageDataUrl(image, store);
  const encrypted = storedFileCipher.encrypt(parsed.bytes, {
    store,
    rowId,
    mimeType: parsed.mimeType,
    plaintextSize: parsed.bytes.length,
  });

  return {
    image: parsed,
    envelope: {
      ciphertext: encrypted.ciphertext,
      keyVersion: encrypted.version,
      mimeType: parsed.mimeType,
      nonce: encrypted.nonce,
      size: parsed.bytes.length,
      tag: encrypted.tag,
    },
  };
}

export function decryptStoredImage(
  envelope: StoredImageEnvelope,
  store: ImageStoredFileStore,
  rowId: string,
  storedFileCipher: StoredFileCipher,
): string | null {
  if (hasNoStoredImageValues(envelope)) {
    return null;
  }

  const completeEnvelope = requireCompleteStoredImageEnvelope(envelope);
  const plaintext = storedFileCipher.decrypt(completeEnvelope, {
    store,
    rowId,
    mimeType: completeEnvelope.mimeType,
    plaintextSize: completeEnvelope.size,
  });

  return serializeCanonicalImageDataUrl(completeEnvelope.mimeType, plaintext, store);
}

export function emptyStoredImageEnvelope(): StoredImageEnvelope {
  return {
    ciphertext: null,
    keyVersion: null,
    mimeType: null,
    nonce: null,
    size: null,
    tag: null,
  };
}

function hasNoStoredImageValues(envelope: StoredImageEnvelope): boolean {
  return Object.values(envelope).every((value) => value === null);
}

function requireCompleteStoredImageEnvelope(envelope: StoredImageEnvelope): StoredFileEnvelope & { mimeType: ImageMimeType; size: number } {
  const size = envelope.size;
  if (
    !Buffer.isBuffer(envelope.ciphertext) ||
    typeof envelope.keyVersion !== 'string' ||
    !isImageMimeType(envelope.mimeType) ||
    !Buffer.isBuffer(envelope.nonce) ||
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    !Buffer.isBuffer(envelope.tag)
  ) {
    throw new StoredFileCryptographyException();
  }

  return {
    ciphertext: envelope.ciphertext,
    version: envelope.keyVersion,
    mimeType: envelope.mimeType,
    nonce: envelope.nonce,
    size,
    tag: envelope.tag,
  };
}

function isImageMimeType(value: unknown): value is ImageMimeType {
  return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp';
}
