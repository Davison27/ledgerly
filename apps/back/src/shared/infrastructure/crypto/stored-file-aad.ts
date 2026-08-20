import { StoredFileAadDescriptor, StoredFileStore } from '../../domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { assertStoredFilePlaintextSize } from './stored-file-policy';

const STORE_CODES: Readonly<Record<StoredFileStore, number>> = {
  document: 0x01,
  invoicePdf: 0x02,
  staffDocument: 0x03,
  companyLogo: 0x04,
  projectImage: 0x05,
  productImage: 0x06,
};

const SCHEMA_VERSION = 0x01;
const STORE_FIELD_ID = 0x01;
const ROW_ID_FIELD_ID = 0x02;
const MIME_FIELD_ID = 0x03;
const SIZE_FIELD_ID = 0x04;
const ENUM_TYPE = 0x01;
const UTF8_TYPE = 0x02;
const UNSIGNED_64_BIT_TYPE = 0x03;
const ABSENT = 0x00;
const PRESENT = 0x01;
const ROW_ID_MAX_BYTES = 128;
const MIME_MAX_BYTES = 127;

export function buildStoredFileAad(descriptor: StoredFileAadDescriptor): Buffer {
  const storeCode = getStoreCode(descriptor?.store);
  const rowId = requireText(descriptor?.rowId, ROW_ID_MAX_BYTES, false);
  const mimeType = requireNullableText(descriptor?.mimeType, MIME_MAX_BYTES);
  const plaintextSize = descriptor?.plaintextSize;

  assertStoredFilePlaintextSize(descriptor?.store, plaintextSize);

  return Buffer.concat([
    Buffer.from([SCHEMA_VERSION]),
    encodeField(STORE_FIELD_ID, ENUM_TYPE, Buffer.from([storeCode])),
    encodeField(ROW_ID_FIELD_ID, UTF8_TYPE, rowId),
    encodeField(MIME_FIELD_ID, UTF8_TYPE, mimeType),
    encodeField(SIZE_FIELD_ID, UNSIGNED_64_BIT_TYPE, encodeUnsigned64(plaintextSize)),
  ]);
}

function getStoreCode(store: unknown): number {
  if (typeof store !== 'string' || !(store in STORE_CODES)) {
    throw new StoredFileCryptographyException();
  }
  return STORE_CODES[store as StoredFileStore];
}

function requireText(value: unknown, maximumBytes: number, allowEmpty: boolean): Buffer {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || !isWellFormedUnicode(value)) {
    throw new StoredFileCryptographyException();
  }

  const encoded = Buffer.from(value, 'utf8');
  if (encoded.length > maximumBytes) {
    throw new StoredFileCryptographyException();
  }
  return encoded;
}

function requireNullableText(value: unknown, maximumBytes: number): Buffer | null {
  if (value === null) {
    return null;
  }
  return requireText(value, maximumBytes, true);
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) {
        return false;
      }
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function encodeField(fieldId: number, type: number, payload: Buffer | null): Buffer {
  if (payload === null) {
    return Buffer.from([fieldId, type, ABSENT, 0x00, 0x00, 0x00, 0x00]);
  }

  const header = Buffer.alloc(7);
  header.writeUInt8(fieldId, 0);
  header.writeUInt8(type, 1);
  header.writeUInt8(PRESENT, 2);
  header.writeUInt32BE(payload.length, 3);
  return Buffer.concat([header, payload]);
}

function encodeUnsigned64(value: number): Buffer {
  const payload = Buffer.alloc(8);
  payload.writeBigUInt64BE(BigInt(value));
  return payload;
}
