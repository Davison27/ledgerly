import { StoredFileConfigurationException } from '../../domain/errors/stored-file-configuration.exception';

export interface StoredFileKeyring {
  activeVersion: string;
  keys: ReadonlyMap<string, Buffer>;
}

export interface StoredFileKeyringInput {
  activeVersion: unknown;
  keys: unknown;
  environment: unknown;
}

export const STORED_FILE_KEY_VERSION_PATTERN = /^v[1-9][0-9]{0,8}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function parseStoredFileKeyring(input: unknown): StoredFileKeyring {
  const keyringInput = readInput(input);
  const activeVersion = requireVersion(keyringInput.activeVersion);
  const environment = requireEnvironment(keyringInput.environment);
  const entries = readKeyEntries(keyringInput.keys);
  const keys = new Map<string, Buffer>();

  for (const [version, serializedKey] of entries) {
    const validVersion = requireVersion(version);
    if (keys.has(validVersion)) {
      throw new StoredFileConfigurationException();
    }
    keys.set(validVersion, decodeKey(serializedKey, environment));
  }

  if (keys.size === 0 || !keys.has(activeVersion)) {
    throw new StoredFileConfigurationException();
  }

  return { activeVersion, keys };
}

function readInput(input: unknown): StoredFileKeyringInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new StoredFileConfigurationException();
  }
  return input as StoredFileKeyringInput;
}

function requireVersion(value: unknown): string {
  if (!isStoredFileKeyVersion(value)) {
    throw new StoredFileConfigurationException();
  }
  return value;
}

export function isStoredFileKeyVersion(value: unknown): value is string {
  return typeof value === 'string' && STORED_FILE_KEY_VERSION_PATTERN.test(value);
}

function requireEnvironment(value: unknown): 'development' | 'production' | 'test' {
  if (value === 'development' || value === 'production' || value === 'test') {
    return value;
  }
  throw new StoredFileConfigurationException();
}

function readKeyEntries(value: unknown): [unknown, unknown][] {
  if (typeof value === 'string') {
    return readSerializedKeyEntries(value);
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new StoredFileConfigurationException();
  }

  return Object.entries(value as Record<string, unknown>);
}

function readSerializedKeyEntries(value: string): [string, string][] {
  if (value.length === 0) {
    throw new StoredFileConfigurationException();
  }

  const matches = [...value.matchAll(/"([^"\\]+)":"([^"\\]*)"/g)];
  const entries = matches.map((match) => [match[1], match[2]] as [string, string]);
  const canonicalMap = `{${entries.map(([version, key]) => `"${version}":"${key}"`).join(',')}}`;

  if (entries.length === 0 || value !== canonicalMap) {
    throw new StoredFileConfigurationException();
  }

  return entries;
}

function decodeKey(value: unknown, environment: 'development' | 'production' | 'test'): Buffer {
  if (typeof value !== 'string' || !BASE64_PATTERN.test(value)) {
    throw new StoredFileConfigurationException();
  }

  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value || isUnsafeProductionKey(key, environment)) {
    throw new StoredFileConfigurationException();
  }
  return key;
}

function isUnsafeProductionKey(key: Buffer, environment: 'development' | 'production' | 'test'): boolean {
  return environment === 'production' && key.every((byte) => byte === key[0]);
}
