import * as crypto from 'node:crypto';
import { StoredFileAadDescriptor, StoredFileCipher, StoredFileEnvelope } from '../../domain/stored-file-cipher.port';
import { StoredFileConfigurationException } from '../../domain/errors/stored-file-configuration.exception';
import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { buildStoredFileAad } from './stored-file-aad';
import { isStoredFileKeyVersion, StoredFileKeyring } from './stored-file-keyring';
import { assertStoredFilePlaintextSize } from './stored-file-policy';

const NONCE_BYTES = 12;
const AUTHENTICATION_TAG_BYTES = 16;

export function createStoredFileCipher(
  keyring: StoredFileKeyring,
  generateRandomBytes: (size: number) => Buffer = crypto.randomBytes,
): StoredFileCipher {
  const validatedKeyring = validateKeyring(keyring);

  return {
    encrypt(plaintext, descriptor) {
      assertPlaintext(plaintext, descriptor);
      const aad = buildStoredFileAad(descriptor);
      try {
        const nonce = generateRandomBytes(NONCE_BYTES);
        if (!Buffer.isBuffer(nonce) || nonce.length !== NONCE_BYTES) {
          throw new StoredFileCryptographyException();
        }
        const cipher = crypto.createCipheriv('aes-256-gcm', validatedKeyring.activeKey, nonce, {
          authTagLength: AUTHENTICATION_TAG_BYTES,
        });
        cipher.setAAD(aad, { plaintextLength: plaintext.length });
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();

        if (tag.length !== AUTHENTICATION_TAG_BYTES) {
          throw new StoredFileCryptographyException();
        }

        return {
          version: validatedKeyring.activeVersion,
          nonce,
          tag,
          ciphertext,
        };
      } catch {
        throw new StoredFileCryptographyException();
      }
    },

    decrypt(envelope, descriptor) {
      try {
        const aad = buildStoredFileAad(descriptor);
        const validatedEnvelope = validateEnvelope(envelope, descriptor.plaintextSize, validatedKeyring.keys);
        const decipher = crypto.createDecipheriv('aes-256-gcm', validatedEnvelope.key, validatedEnvelope.nonce, {
          authTagLength: AUTHENTICATION_TAG_BYTES,
        });
        decipher.setAAD(aad, { plaintextLength: validatedEnvelope.ciphertext.length });
        decipher.setAuthTag(validatedEnvelope.tag);
        const plaintext = Buffer.concat([decipher.update(validatedEnvelope.ciphertext), decipher.final()]);

        if (plaintext.length !== descriptor.plaintextSize) {
          throw new StoredFileCryptographyException();
        }

        return plaintext;
      } catch {
        throw new StoredFileCryptographyException();
      }
    },
  };
}

function validateKeyring(keyring: StoredFileKeyring): { activeVersion: string; activeKey: Buffer; keys: ReadonlyMap<string, Buffer> } {
  if (!keyring || typeof keyring.activeVersion !== 'string' || !(keyring.keys instanceof Map)) {
    throw new StoredFileConfigurationException();
  }

  const keys = new Map<string, Buffer>();
  for (const [version, key] of keyring.keys) {
    if (!isStoredFileKeyVersion(version) || !Buffer.isBuffer(key) || key.length !== 32) {
      throw new StoredFileConfigurationException();
    }
    keys.set(version, Buffer.from(key));
  }

  const activeKey = keys.get(keyring.activeVersion);
  if (!isStoredFileKeyVersion(keyring.activeVersion) || !activeKey) {
    throw new StoredFileConfigurationException();
  }

  return { activeVersion: keyring.activeVersion, activeKey, keys };
}

function assertPlaintext(plaintext: unknown, descriptor: StoredFileAadDescriptor): asserts plaintext is Buffer {
  if (!Buffer.isBuffer(plaintext)) {
    throw new StoredFileCryptographyException();
  }
  assertStoredFilePlaintextSize(descriptor?.store, plaintext.length);
  if (plaintext.length !== descriptor?.plaintextSize) {
    throw new StoredFileCryptographyException();
  }
}

function validateEnvelope(
  envelope: StoredFileEnvelope,
  plaintextSize: number,
  keys: ReadonlyMap<string, Buffer>,
): { key: Buffer; nonce: Buffer; tag: Buffer; ciphertext: Buffer } {
  if (
    !envelope ||
    typeof envelope.version !== 'string' ||
    !/^v[1-9][0-9]{0,8}$/.test(envelope.version) ||
    !Buffer.isBuffer(envelope.nonce) ||
    envelope.nonce.length !== NONCE_BYTES ||
    !Buffer.isBuffer(envelope.tag) ||
    envelope.tag.length !== AUTHENTICATION_TAG_BYTES ||
    !Buffer.isBuffer(envelope.ciphertext) ||
    envelope.ciphertext.length !== plaintextSize
  ) {
    throw new StoredFileCryptographyException();
  }

  const key = keys.get(envelope.version);
  if (!key || !Buffer.isBuffer(key) || key.length !== 32) {
    throw new StoredFileCryptographyException();
  }

  return { key, nonce: envelope.nonce, tag: envelope.tag, ciphertext: envelope.ciphertext };
}
