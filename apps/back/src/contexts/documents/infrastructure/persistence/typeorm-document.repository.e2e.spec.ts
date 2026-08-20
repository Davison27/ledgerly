import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from '../../../../database/migrations/1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from '../../../../database/migrations/1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from '../../../../database/migrations/1730000002000-AddEncryptedStoredFileEnvelopes';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { DocumentOrmEntity } from './document.orm-entity';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';

describe('TypeOrmDocumentRepository encrypted delete (PostgreSQL)', () => {
  let administrator: DataSource;
  let dataSource: DataSource;
  let schema: string;

  beforeAll(async () => {
    const databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_document_repository_${randomUUID().replaceAll('-', '')}`;
    administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [DocumentOrmEntity],
      migrations: [
        InitialLedgerlySchema1730000000000,
        AddListQueryIndexes1730000001000,
        AddEncryptedStoredFileEnvelopes1730000002000,
      ],
      migrationsTransactionMode: 'each',
      extra: { max: 1, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (administrator?.isInitialized) {
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('leaves an encrypted row unchanged when a different project attempts deletion', async () => {
    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    const document = entityRepository.create({
      id: '00000000-0000-0000-0000-000000000001',
      projectId: '00000000-0000-0000-0000-000000000101',
      name: 'Document',
      type: 'invoice',
      month: 1,
      date: '2026-01-01',
      amount: '0',
      status: 'pending',
      currency: 'EUR',
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      fileSize: 4,
      direction: 'incoming',
    });
    await entityRepository.save(document);
    const storedFileCipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const repository = new TypeOrmDocumentRepository(entityRepository, storedFileCipher);

    await repository.saveContent(document.id, Buffer.from('%PDF'));
    const encryptedBefore = await selectEncryptedDocument(dataSource, document.id);

    await expect(repository.delete(document.id, '00000000-0000-0000-0000-000000000102')).resolves.toBe(false);
    await expect(selectEncryptedDocument(dataSource, document.id)).resolves.toEqual(encryptedBefore);

    await expect(repository.delete(document.id, document.projectId)).resolves.toBe(true);
    await expect(selectEncryptedDocument(dataSource, document.id)).resolves.toBeNull();
  });
});

async function selectEncryptedDocument(
  dataSource: DataSource,
  id: string,
): Promise<{ ciphertext: Buffer; keyVersion: string; nonce: Buffer; tag: Buffer } | null> {
  const rows: Array<{ ciphertext: Buffer; keyVersion: string; nonce: Buffer; tag: Buffer }> = await dataSource.query(
    `SELECT content_ciphertext AS ciphertext, content_nonce AS nonce, content_tag AS tag, content_key_version AS "keyVersion" FROM documents WHERE id = $1`,
    [id],
  );

  return rows[0] ?? null;
}

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid migration test database URL');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid migration test database URL');
  }

  if (
    (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') ||
    (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') ||
    url.port.length === 0 ||
    url.pathname !== '/ledgerly_migration_test' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error('Invalid migration test database URL');
  }

  return value;
}
