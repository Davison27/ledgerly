import { StoredFileConfigurationException } from '../../domain/errors/stored-file-configuration.exception';
import { parseStoredFileKeyring } from './stored-file-keyring';

const key = Buffer.alloc(32, 0x11).toString('base64');
const anotherKey = Buffer.alloc(32, 0x22).toString('base64');

function buildInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    activeVersion: 'v1',
    keys: JSON.stringify({ v1: key, v2: anotherKey }),
    environment: 'development',
    ...overrides,
  };
}

describe('parseStoredFileKeyring', () => {
  it('parses a versioned canonical base64 key map with an active key', () => {
    const keyring = parseStoredFileKeyring(buildInput());

    expect(keyring.activeVersion).toBe('v1');
    expect(keyring.keys.get('v1')).toEqual(Buffer.alloc(32, 0x11));
    expect(keyring.keys.get('v2')).toEqual(Buffer.alloc(32, 0x22));
  });

  it.each([
    buildInput({ activeVersion: undefined }),
    buildInput({ activeVersion: '' }),
    buildInput({ activeVersion: '1' }),
    buildInput({ activeVersion: 'v3' }),
    buildInput({ keys: undefined }),
    buildInput({ keys: '' }),
    buildInput({ keys: JSON.stringify({ v1: '' }) }),
    buildInput({ keys: JSON.stringify({ v1: key.replace(/=$/, '') }) }),
    buildInput({ keys: JSON.stringify({ v1: `${key}\n` }) }),
    buildInput({ keys: JSON.stringify({ v1: Buffer.alloc(31, 0x11).toString('base64') }) }),
    buildInput({ keys: `{"v1":"${key}","v1":"${anotherKey}"}` }),
    buildInput({ keys: JSON.stringify({ version1: key }) }),
    buildInput({ environment: 'production', keys: JSON.stringify({ v1: Buffer.alloc(32).toString('base64') }) }),
    buildInput({ environment: 'production', keys: JSON.stringify({ v1: Buffer.alloc(32, 0x7f).toString('base64') }) }),
  ])('rejects invalid key configuration', (input) => {
    expect(() => parseStoredFileKeyring(input)).toThrow(StoredFileConfigurationException);
  });
});
