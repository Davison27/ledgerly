import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { assertStoredFilePlaintextSize, getStoredFilePlaintextLimit } from './stored-file-policy';

export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

export type ImageStoredFileStore = 'companyLogo' | 'projectImage' | 'equipmentImage';

export interface CanonicalImageDataUrl {
  mimeType: ImageMimeType;
  bytes: Buffer;
}

const DATA_URL_PREFIXES: Readonly<Record<ImageMimeType, string>> = {
  'image/png': 'data:image/png;base64,',
  'image/jpeg': 'data:image/jpeg;base64,',
  'image/webp': 'data:image/webp;base64,',
};

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function parseCanonicalImageDataUrl(value: unknown, store: ImageStoredFileStore): CanonicalImageDataUrl {
  if (typeof value !== 'string') {
    throw new StoredFileCryptographyException();
  }

  const mimeType = findMimeType(value);
  const payload = value.slice(DATA_URL_PREFIXES[mimeType].length);
  if (payload.length === 0 || exceedsImageEncodedSizeLimit(payload, store) || !BASE64_PATTERN.test(payload)) {
    throw new StoredFileCryptographyException();
  }

  assertImageSize(store, decodedBase64Size(payload));

  const bytes = Buffer.from(payload, 'base64');
  if (bytes.length === 0 || bytes.toString('base64') !== payload) {
    throw new StoredFileCryptographyException();
  }

  assertImageSize(store, bytes.length);
  assertImageMagicBytes(mimeType, bytes);

  return { mimeType, bytes };
}

export function serializeCanonicalImageDataUrl(
  mimeType: ImageMimeType,
  bytes: Buffer,
  store: ImageStoredFileStore,
): string {
  if (!Buffer.isBuffer(bytes)) {
    throw new StoredFileCryptographyException();
  }

  assertImageSize(store, bytes.length);
  assertImageMagicBytes(mimeType, bytes);

  return `${DATA_URL_PREFIXES[mimeType]}${bytes.toString('base64')}`;
}

export function isCanonicalImageDataUrl(value: unknown, store: ImageStoredFileStore): boolean {
  try {
    parseCanonicalImageDataUrl(value, store);
    return true;
  } catch {
    return false;
  }
}

function findMimeType(value: string): ImageMimeType {
  for (const [mimeType, prefix] of Object.entries(DATA_URL_PREFIXES) as Array<[ImageMimeType, string]>) {
    if (value.startsWith(prefix)) {
      return mimeType;
    }
  }

  throw new StoredFileCryptographyException();
}

function assertImageSize(store: ImageStoredFileStore, size: number): void {
  assertStoredFilePlaintextSize(store, size);
}

function exceedsImageEncodedSizeLimit(payload: string, store: ImageStoredFileStore): boolean {
  return payload.length > 4 * Math.ceil(getStoredFilePlaintextLimit(store) / 3);
}

function decodedBase64Size(payload: string): number {
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return (payload.length / 4) * 3 - padding;
}

function assertImageMagicBytes(mimeType: ImageMimeType, bytes: Buffer): void {
  if (
    (mimeType === 'image/png' && !isPng(bytes)) ||
    (mimeType === 'image/jpeg' && !isJpeg(bytes)) ||
    (mimeType === 'image/webp' && !isWebp(bytes))
  ) {
    throw new StoredFileCryptographyException();
  }
}

function isPng(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
}

function isWebp(bytes: Buffer): boolean {
  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).equals(Buffer.from('RIFF')) &&
    bytes.readUInt32LE(4) === bytes.length - 8 &&
    bytes.subarray(8, 12).equals(Buffer.from('WEBP'))
  );
}
