import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { STORED_FILE_CIPHER, StoredFileCipher } from './domain/stored-file-cipher.port';
import { StoredFileConfigurationException } from './domain/errors/stored-file-configuration.exception';
import { SharedModule } from './shared.module';

const key = Buffer.alloc(32, 0x11).toString('base64');

describe('SharedModule stored file cipher provider', () => {
  it('builds the shared cipher from validated configuration', async () => {
    const values = {
      NODE_ENV: 'test',
      STORED_FILE_ACTIVE_KEY_VERSION: 'v1',
      STORED_FILE_KEYS: JSON.stringify({ v1: key }),
    };
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => values] }), SharedModule],
    }).compile();
    const cipher = module.get<StoredFileCipher>(STORED_FILE_CIPHER);
    const plaintext = Buffer.from('provider bootstrap');
    const descriptor = {
      store: 'document' as const,
      rowId: 'provider-row',
      mimeType: 'application/pdf',
      plaintextSize: plaintext.length,
    };

    expect(cipher.decrypt(cipher.encrypt(plaintext, descriptor), descriptor)).toEqual(plaintext);
  });

  it('fails module bootstrap when the keyring is malformed', async () => {
    const values = {
      NODE_ENV: 'test',
      STORED_FILE_ACTIVE_KEY_VERSION: 'v1',
      STORED_FILE_KEYS: JSON.stringify({ v1: 'not-a-key' }),
    };

    await expect(
      Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => values] }), SharedModule],
      }).compile(),
    ).rejects.toThrow(StoredFileConfigurationException);
  });
});
