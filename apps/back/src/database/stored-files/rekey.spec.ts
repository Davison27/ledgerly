import { DataSource, EntityManager } from 'typeorm';
import { createStoredFileCipher } from '../../shared/infrastructure/crypto/stored-file-cipher';
import { parseStoredFilesBatchSize } from './bootstrap';
import { rekeyStoredFiles } from './rekey';
import { STORED_FILE_STORES } from './store-registry';
import { verifyStoredFiles } from './verify';

const descriptor = {
  store: 'document' as const,
  rowId: '00000000-0000-0000-0000-000000000001',
  mimeType: 'application/pdf',
  plaintextSize: 5,
};

describe('stored file rekey orchestration', () => {
  it.each([
    [['unexpected'], {}],
    [['--batch-size'], {}],
    [['--batch-size='], {}],
    [['--batch-size=1', '--batch-size=2'], {}],
    [['--batch-size=1'], { STORED_FILES_BATCH_SIZE: '2' }],
  ])('rejects invalid batch-size CLI input', (argv, environment) => {
    expect(() => parseStoredFilesBatchSize(argv, environment)).toThrow('Stored file operation failed');
  });

  it('locks deterministic batches, replaces a retained envelope, and verifies the replacement', async () => {
    const oldCipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([
        ['v1', Buffer.alloc(32, 1)],
        ['v2', Buffer.alloc(32, 2)],
      ]),
    });
    const activeCipher = createStoredFileCipher({
      activeVersion: 'v2',
      keys: new Map([
        ['v1', Buffer.alloc(32, 1)],
        ['v2', Buffer.alloc(32, 2)],
      ]),
    });
    const oldEnvelope = oldCipher.encrypt(Buffer.from('hello'), descriptor);
    const row = {
      id: descriptor.rowId,
      ciphertext: oldEnvelope.ciphertext,
      nonce: oldEnvelope.nonce,
      tag: oldEnvelope.tag,
      keyVersion: oldEnvelope.version,
      mimeType: descriptor.mimeType,
      size: descriptor.plaintextSize,
    };
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    let claims = 0;
    const manager = {
      query: (sql: string, values: unknown[]) => {
        queries.push({ sql, values });
        if (sql.startsWith('SELECT')) return Promise.resolve(claims++ === 0 ? [row] : []);
        return Promise.resolve([{ id: descriptor.rowId }]);
      },
    } as unknown as EntityManager;
    const dataSource = {
      transaction: async (work: (transactionManager: EntityManager) => Promise<number>) => work(manager),
    } as unknown as DataSource;

    await expect(
      rekeyStoredFiles(dataSource, activeCipher, {
        activeVersion: 'v2',
        batchSize: 1,
        stores: [STORED_FILE_STORES[0]],
      }),
    ).resolves.toEqual({ batches: 1, rows: 1 });

    expect(queries[0].sql).toContain('ORDER BY "id" ASC LIMIT $2 FOR UPDATE SKIP LOCKED');
    const replacement = queries[1].values;
    expect(replacement[3]).toBe('v2');
    expect(replacement[1]).not.toEqual(oldEnvelope.nonce);
    expect(
      activeCipher.decrypt(
        { ciphertext: replacement[0] as Buffer, nonce: replacement[1] as Buffer, tag: replacement[2] as Buffer, version: 'v2' },
        descriptor,
      ),
    ).toEqual(Buffer.from('hello'));
  });

  it('counts retired versions without including row identifiers', async () => {
    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([
        ['v1', Buffer.alloc(32, 1)],
        ['v2', Buffer.alloc(32, 2)],
      ]),
    });
    const oldCipher = createStoredFileCipher({ activeVersion: 'v2', keys: new Map([['v1', Buffer.alloc(32, 1)], ['v2', Buffer.alloc(32, 2)]]) });
    const envelope = oldCipher.encrypt(Buffer.from('hello'), descriptor);
    let queried = false;
    const dataSource = {
      query: () => {
        if (queried) return Promise.resolve([]);
        queried = true;
        return Promise.resolve([
          {
            id: descriptor.rowId,
            ciphertext: envelope.ciphertext,
            nonce: envelope.nonce,
            tag: envelope.tag,
            keyVersion: envelope.version,
            mimeType: descriptor.mimeType,
            size: descriptor.plaintextSize,
          },
        ]);
      },
    } as unknown as DataSource;

    await expect(
      verifyStoredFiles(dataSource, cipher, {
        activeVersion: 'v1',
        batchSize: 10,
        knownKeyVersions: new Set(['v1', 'v2']),
        stores: [STORED_FILE_STORES[0]],
      }),
    ).resolves.toEqual({
      valid: false,
      counts: [{ store: 'document', keyVersion: 'v2', result: 'retired-version', count: 1 }],
    });
  });
});
