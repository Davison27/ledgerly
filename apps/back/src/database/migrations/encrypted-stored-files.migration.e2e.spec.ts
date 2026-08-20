import { randomUUID } from 'node:crypto';
import { DataSource, MigrationInterface } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from './1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from './1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from './1730000002000-AddEncryptedStoredFileEnvelopes';

type StoredFileFixture = {
  ciphertextColumn: string;
  keyVersionColumn: string;
  legacyColumn: string;
  mimeTypeColumn: string | null;
  nonceColumn: string;
  sizeColumn: string;
  table: string;
  tagColumn: string;
};

type StoredFileEnvelope = {
  ciphertext: Buffer | null;
  keyVersion: string | null;
  mimeType: string | null;
  nonce: Buffer | null;
  size: number | null;
  tag: Buffer | null;
};

const storedFileFixtures: readonly StoredFileFixture[] = [
  {
    table: 'documents',
    legacyColumn: 'content',
    ciphertextColumn: 'content_ciphertext',
    nonceColumn: 'content_nonce',
    tagColumn: 'content_tag',
    keyVersionColumn: 'content_key_version',
    mimeTypeColumn: null,
    sizeColumn: 'file_size',
  },
  {
    table: 'invoices',
    legacyColumn: 'pdf',
    ciphertextColumn: 'pdf_ciphertext',
    nonceColumn: 'pdf_nonce',
    tagColumn: 'pdf_tag',
    keyVersionColumn: 'pdf_key_version',
    mimeTypeColumn: null,
    sizeColumn: 'pdf_size',
  },
  {
    table: 'staff_documents',
    legacyColumn: 'content',
    ciphertextColumn: 'content_ciphertext',
    nonceColumn: 'content_nonce',
    tagColumn: 'content_tag',
    keyVersionColumn: 'content_key_version',
    mimeTypeColumn: null,
    sizeColumn: 'file_size',
  },
  {
    table: 'companies',
    legacyColumn: 'logo',
    ciphertextColumn: 'logo_ciphertext',
    nonceColumn: 'logo_nonce',
    tagColumn: 'logo_tag',
    keyVersionColumn: 'logo_key_version',
    mimeTypeColumn: 'logo_mime_type',
    sizeColumn: 'logo_size',
  },
  {
    table: 'projects',
    legacyColumn: 'image',
    ciphertextColumn: 'image_ciphertext',
    nonceColumn: 'image_nonce',
    tagColumn: 'image_tag',
    keyVersionColumn: 'image_key_version',
    mimeTypeColumn: 'image_mime_type',
    sizeColumn: 'image_size',
  },
  {
    table: 'products',
    legacyColumn: 'image',
    ciphertextColumn: 'image_ciphertext',
    nonceColumn: 'image_nonce',
    tagColumn: 'image_tag',
    keyVersionColumn: 'image_key_version',
    mimeTypeColumn: 'image_mime_type',
    sizeColumn: 'image_size',
  },
];

describe('parseMigrationTestDatabaseUrl', () => {
  it.each([
    'postgres://ledgerly_test:secret@localhost:5432/ledgerly_migration_test',
    'postgresql://ledgerly_test:secret@127.0.0.1:6543/ledgerly_migration_test',
  ])('accepts an explicit local migration test URL', (value) => {
    expect(parseMigrationTestDatabaseUrl(value)).toBe(value);
  });

  it.each([
    undefined,
    'postgresql://ledgerly_test:secret@database.internal:5432/ledgerly_migration_test',
    'postgresql://ledgerly_test:secret@localhost/ledgerly_migration_test',
    'postgresql://ledgerly_test:secret@localhost:5432/ledgerly',
    'postgresql://ledgerly_test:secret@localhost:5432/ledgerly_migration_test?sslmode=require',
  ])('rejects an unsafe migration test URL before a database connection', (value) => {
    expect(() => parseMigrationTestDatabaseUrl(value)).toThrow('Invalid migration test database URL');
  });

  it('does not expose database credentials in a rejected URL error', () => {
    try {
      parseMigrationTestDatabaseUrl('postgresql://ledgerly_test:secret@database.internal:5432/ledgerly_migration_test');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain('secret');
    }
  });
});

describe('AddEncryptedStoredFileEnvelopes1730000002000', () => {
  let dataSource: DataSource;
  let schema: string;
  let testDatabaseUrl: string;

  beforeEach(async () => {
    schema = '';
    testDatabaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);

    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;
    const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = createMigrationDataSource(testDatabaseUrl, schema, [
      InitialLedgerlySchema1730000000000,
      AddListQueryIndexes1730000001000,
    ]);
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (schema && testDatabaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('registers and applies the encrypted stored-file migration to an empty schema', async () => {
    await replaceDataSourceWithEncryptedMigration();

    expect(dataSource.migrations).toEqual(
      expect.arrayContaining([expect.any(AddEncryptedStoredFileEnvelopes1730000002000)]),
    );

    for (const fixture of storedFileFixtures) {
      await expectColumn(fixture.table, fixture.legacyColumn, false);
      await expectColumn(fixture.table, fixture.ciphertextColumn, true);
    }
  });

  it.each(storedFileFixtures)('refuses legacy plaintext in $table.$legacyColumn before schema changes', async (fixture) => {
    await insertBaseRow(fixture.table);
    await dataSource.query(`UPDATE "${fixture.table}" SET "${fixture.legacyColumn}" = $1`, [legacyValue(fixture)]);

    await expect(runEncryptedMigrationUp()).rejects.toThrow(fixture.table);

    await expectColumn(fixture.table, fixture.legacyColumn, true);
    await expectColumn(fixture.table, fixture.ciphertextColumn, false);
  });

  it('allows a null or complete encrypted envelope for every stored-file location', async () => {
    await replaceDataSourceWithEncryptedMigration();
    await insertBaseRows();

    for (const fixture of storedFileFixtures) {
      await expectEnvelopeColumnsToBeNull(fixture);
      await writeEnvelope(fixture, validEnvelope(fixture, 4));
    }
  });

  it.each(storedFileFixtures)('rejects a partial encrypted envelope for $table', async (fixture) => {
    await replaceDataSourceWithEncryptedMigration();
    await insertBaseRow(fixture.table);

    await expect(
      writeEnvelope(fixture, {
        ciphertext: Buffer.alloc(4),
        nonce: null,
        tag: null,
        keyVersion: null,
        mimeType: null,
        size: null,
      }),
    ).rejects.toBeDefined();
  });

  it.each(storedFileFixtures)('rejects invalid nonce, tag, and key-version values for $table', async (fixture) => {
    await replaceDataSourceWithEncryptedMigration();
    await insertBaseRow(fixture.table);

    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { nonce: Buffer.alloc(11) }))).rejects.toBeDefined();
    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { nonce: Buffer.alloc(13) }))).rejects.toBeDefined();
    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { tag: Buffer.alloc(15) }))).rejects.toBeDefined();
    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { keyVersion: 'v0' }))).rejects.toBeDefined();
  });

  it.each(storedFileFixtures)('rejects invalid authenticated sizes for $table', async (fixture) => {
    await replaceDataSourceWithEncryptedMigration();
    await insertBaseRow(fixture.table);

    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { size: -1 }))).rejects.toBeDefined();
    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { size: maximumSize(fixture) + 1 }))).rejects.toBeDefined();
    await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { size: 3 }))).rejects.toBeDefined();
  });

  it.each(storedFileFixtures.filter((fixture) => fixture.mimeTypeColumn !== null))(
    'rejects an unsupported image MIME type for $table',
    async (fixture) => {
      await replaceDataSourceWithEncryptedMigration();
      await insertBaseRow(fixture.table);

      await expect(writeEnvelope(fixture, validEnvelope(fixture, 4, { mimeType: 'image/gif' }))).rejects.toBeDefined();
    },
  );

  it('reverts only an empty encrypted schema and can run again', async () => {
    await replaceDataSourceWithEncryptedMigration();

    await dataSource.undoLastMigration({ transaction: 'each' });

    for (const fixture of storedFileFixtures) {
      await expectColumn(fixture.table, fixture.legacyColumn, true);
      await expectColumn(fixture.table, fixture.ciphertextColumn, false);
    }

    await dataSource.runMigrations({ transaction: 'each' });

    for (const fixture of storedFileFixtures) {
      await expectColumn(fixture.table, fixture.legacyColumn, false);
      await expectColumn(fixture.table, fixture.ciphertextColumn, true);
    }
  });

  it('refuses to revert before DDL when encrypted data exists', async () => {
    await replaceDataSourceWithEncryptedMigration();
    await insertBaseRow('documents');
    await writeEnvelope(storedFileFixtures[0], validEnvelope(storedFileFixtures[0], 4));

    await expect(runEncryptedMigrationDown()).rejects.toThrow('documents');

    await expectColumn('documents', 'content_ciphertext', true);
    await expectColumn('documents', 'content', false);
  });

  async function replaceDataSourceWithEncryptedMigration(): Promise<void> {
    await dataSource.destroy();
    dataSource = createMigrationDataSource(testDatabaseUrl, schema, [
      InitialLedgerlySchema1730000000000,
      AddListQueryIndexes1730000001000,
      AddEncryptedStoredFileEnvelopes1730000002000,
    ]);
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
  }

  async function runEncryptedMigrationUp(): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await new AddEncryptedStoredFileEnvelopes1730000002000().up(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async function runEncryptedMigrationDown(): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await new AddEncryptedStoredFileEnvelopes1730000002000().down(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async function insertBaseRows(): Promise<void> {
    for (const fixture of storedFileFixtures) {
      await insertBaseRow(fixture.table);
    }
  }

  async function insertBaseRow(table: string): Promise<void> {
    if (table === 'documents') {
      await dataSource.query(
        `INSERT INTO "documents" ("id", "project_id", "name", "type", "month", "date", "amount", "status", "currency", "mime_type", "file_size", "direction") VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Document', 'invoice', 1, '2026-01-01', 0, 'pending', 'EUR', 'application/pdf', 0, 'incoming')`,
      );
      return;
    }
    if (table === 'invoices') {
      await dataSource.query(
        `INSERT INTO "invoices" ("id", "series", "year", "number", "issue_date", "project_id", "customer_name", "tax_base", "tax_rate", "tax_amount", "irpf_rate", "irpf_amount", "total", "currency", "pdf_size") VALUES ('00000000-0000-0000-0000-000000000002', 'A', 2026, 1, '2026-01-01', '00000000-0000-0000-0000-000000000102', 'Customer', 0, 0, 0, 0, 0, 0, 'EUR', 0)`,
      );
      return;
    }
    if (table === 'staff_documents') {
      await dataSource.query(
        `INSERT INTO "staff_documents" ("id", "staff_member_id", "type_id", "name", "issue_date", "file_name", "mime_type", "file_size") VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000203', 'Staff document', '2026-01-01', 'document.pdf', 'application/pdf', 0)`,
      );
      return;
    }
    if (table === 'companies') {
      await dataSource.query(`INSERT INTO "companies" ("id", "name") VALUES ('00000000-0000-0000-0000-000000000004', 'Company')`);
      return;
    }
    if (table === 'projects') {
      await dataSource.query(
        `INSERT INTO "projects" ("id", "name", "code", "type") VALUES ('00000000-0000-0000-0000-000000000005', 'Project', 'PROJECT-001', 'service')`,
      );
      return;
    }
    await dataSource.query(
      `INSERT INTO "products" ("id", "name", "stock") VALUES ('00000000-0000-0000-0000-000000000006', 'Product', 0)`,
    );
  }

  async function writeEnvelope(fixture: StoredFileFixture, envelope: StoredFileEnvelope): Promise<void> {
    const assignments = [
      `"${fixture.ciphertextColumn}" = $1`,
      `"${fixture.nonceColumn}" = $2`,
      `"${fixture.tagColumn}" = $3`,
      `"${fixture.keyVersionColumn}" = $4`,
      `"${fixture.sizeColumn}" = $5`,
    ];
    const values: unknown[] = [envelope.ciphertext, envelope.nonce, envelope.tag, envelope.keyVersion, envelope.size];
    if (fixture.mimeTypeColumn) {
      assignments.push(`"${fixture.mimeTypeColumn}" = $6`);
      values.push(envelope.mimeType);
    }
    await dataSource.query(`UPDATE "${fixture.table}" SET ${assignments.join(', ')}`, values);
  }

  async function expectEnvelopeColumnsToBeNull(fixture: StoredFileFixture): Promise<void> {
    const columns = [fixture.ciphertextColumn, fixture.nonceColumn, fixture.tagColumn, fixture.keyVersionColumn];
    if (fixture.mimeTypeColumn) {
      columns.push(fixture.mimeTypeColumn, fixture.sizeColumn);
    }
    const queryResult: unknown = await dataSource.query(
      `SELECT 1 FROM "${fixture.table}" WHERE ${columns.map((column) => `"${column}" IS NULL`).join(' AND ')}`,
    );
    const rows = Array.isArray(queryResult) ? queryResult : [];
    expect(rows).toHaveLength(1);
  }

  async function expectColumn(table: string, column: string, exists: boolean): Promise<void> {
    const queryResult: unknown = await dataSource.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    const rows = Array.isArray(queryResult) ? queryResult : [];
    expect(rows).toHaveLength(exists ? 1 : 0);
  }
});

function createMigrationDataSource(
  testDatabaseUrl: string,
  schema: string,
  migrations: Array<new () => MigrationInterface>,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    migrations,
    migrationsTransactionMode: 'each',
    extra: { max: 1, options: `-c search_path=${schema},public` },
  });
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

function legacyValue(fixture: StoredFileFixture): Buffer | string {
  return fixture.legacyColumn === 'logo' || fixture.legacyColumn === 'image' ? 'data:image/png;base64,AA==' : Buffer.from('legacy');
}

function validEnvelope(
  fixture: StoredFileFixture,
  size: number,
  overrides: Partial<StoredFileEnvelope> = {},
): StoredFileEnvelope {
  return {
    ciphertext: Buffer.alloc(size),
    nonce: Buffer.alloc(12),
    tag: Buffer.alloc(16),
    keyVersion: 'v1',
    mimeType: fixture.mimeTypeColumn ? 'image/png' : null,
    size,
    ...overrides,
  };
}

function maximumSize(fixture: StoredFileFixture): number {
  return fixture.mimeTypeColumn ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
}
