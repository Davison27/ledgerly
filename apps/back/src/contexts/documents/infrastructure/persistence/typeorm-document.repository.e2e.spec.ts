import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from '../../../../database/migrations/1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from '../../../../database/migrations/1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from '../../../../database/migrations/1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from '../../../../database/migrations/1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from '../../../../database/migrations/1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from '../../../../database/migrations/1730000005000-AddReferentialIntegrity';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { DeleteProjectUseCase } from '../../../projects/application/delete-project/delete-project.use-case';
import { DeleteStaffMemberUseCase } from '../../../staff/application/delete-staff-member/delete-staff-member.use-case';
import { DeleteSupplierUseCase } from '../../../suppliers/application/delete-supplier/delete-supplier.use-case';
import { TypeOrmProjectFinancialsProvider } from '../../../projects/infrastructure/persistence/typeorm-project-financials-provider';
import { DocumentOrmEntity } from './document.orm-entity';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';
import { StaffMemberOrmEntity } from '../../../staff/infrastructure/persistence/staff-member.orm-entity';
import { SupplierOrmEntity } from '../../../suppliers/infrastructure/persistence/supplier.orm-entity';
import { TypeOrmProjectDocumentCounter } from '../../../projects/infrastructure/persistence/typeorm-project-document-counter';
import { TypeOrmProjectRepository } from '../../../projects/infrastructure/persistence/typeorm-project.repository';
import { TypeOrmStaffMemberRepository } from '../../../staff/infrastructure/persistence/typeorm-staff-member.repository';
import { TypeOrmStaffPayrollCounter } from '../../../staff/infrastructure/persistence/typeorm-staff-payroll-counter';
import { TypeOrmSupplierReferenceCounter } from '../../../suppliers/infrastructure/persistence/typeorm-supplier-reference-counter';
import { TypeOrmSupplierRepository } from '../../../suppliers/infrastructure/persistence/typeorm-supplier.repository';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';

describe('TypeOrmDocumentRepository soft delete (PostgreSQL)', () => {
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
      entities: [DocumentOrmEntity, ProjectOrmEntity, SupplierOrmEntity, StaffMemberOrmEntity],
      migrations: [
        InitialLedgerlySchema1730000000000,
        AddListQueryIndexes1730000001000,
        AddEncryptedStoredFileEnvelopes1730000002000,
        ReconcileEntitySchemaDrift1730000003000,
        AddMissingUniqueConstraints1730000004000,
        AddReferentialIntegrity1730000005000,
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

  it('preserves the encrypted row while hiding it from normal ORM reads', async () => {
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type) VALUES ('00000000-0000-0000-0000-000000000101', 'Project', 'PROJECT-001', 'obra')`,
    );
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

    const deletedAt = new Date('2026-06-15T10:00:00.000Z');
    await expect(
      repository.softDelete(
        document.id,
        '00000000-0000-0000-0000-000000000102',
        deletedAt,
      ),
    ).resolves.toBe(true);

    await expect(selectEncryptedDocument(dataSource, document.id)).resolves.toEqual(encryptedBefore);
    await expect(selectDeletionMetadata(dataSource, document.id)).resolves.toEqual({
      deletedBy: '00000000-0000-0000-0000-000000000102',
      deletedAt,
    });
    await expect(entityRepository.findOne({ where: { id: document.id } })).resolves.toBeNull();
  });

  it('excludes soft-deleted documents from listings, project summaries, and financials', async () => {
    const projectId = '00000000-0000-0000-0000-000000000111';
    const documentId = '00000000-0000-0000-0000-000000000112';
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency) VALUES ($1, 'Summary project', 'PROJECT-111', 'obra', 'EUR')`,
      [projectId],
    );
    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    const document = entityRepository.create({
      id: documentId,
      projectId,
      name: 'Invoice',
      type: 'invoice',
      month: 1,
      date: '2026-01-01',
      amount: '100',
      status: 'pendiente',
      currency: 'EUR',
      fileName: null,
      mimeType: null,
      fileSize: null,
      direction: 'ingreso',
    });
    await entityRepository.save(document);
    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const repository = new TypeOrmDocumentRepository(entityRepository, cipher);
    const projectRepository = new TypeOrmProjectRepository(dataSource.getRepository(ProjectOrmEntity), cipher);
    const financialsProvider = new TypeOrmProjectFinancialsProvider(dataSource);

    await expect(repository.findAllForListing({})).resolves.toEqual([
      expect.objectContaining({ id: documentId }),
    ]);
    await expect(projectRepository.findSummaryById(projectId)).resolves.toMatchObject({
      documentCount: 1,
      pendingCount: 1,
    });
    await expect(financialsProvider.findAll()).resolves.toEqual([
      { projectId, currency: 'EUR', income: 100, expenses: 0 },
    ]);

    await expect(repository.softDelete(documentId, '00000000-0000-0000-0000-000000000113', new Date())).resolves.toBe(true);

    await expect(repository.findAllForListing({})).resolves.toEqual([]);
    await expect(projectRepository.findSummaryById(projectId)).resolves.toMatchObject({
      documentCount: 0,
      pendingCount: 0,
    });
    await expect(financialsProvider.findAll()).resolves.toEqual([]);
  });

  it('archives parents that only have soft-deleted document references', async () => {
    const projectId = '00000000-0000-0000-0000-000000000121';
    const supplierId = '00000000-0000-0000-0000-000000000122';
    const staffMemberId = '00000000-0000-0000-0000-000000000123';
    const documentId = '00000000-0000-0000-0000-000000000124';
    const deletedBy = '00000000-0000-0000-0000-000000000125';
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency) VALUES ($1, 'Referenced project', 'PROJECT-121', 'client', 'EUR')`,
      [projectId],
    );
    await dataSource.query(
      `INSERT INTO suppliers (id, name) VALUES ($1, 'Referenced supplier')`,
      [supplierId],
    );
    await dataSource.query(
      `INSERT INTO staff_members (id, first_name, last_name) VALUES ($1, 'Referenced', 'staff')`,
      [staffMemberId],
    );
    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    const document = entityRepository.create({
      id: documentId,
      projectId,
      name: 'Payroll invoice',
      type: 'nomina',
      month: 1,
      date: '2026-01-01',
      amount: '100',
      status: 'pendiente',
      currency: 'EUR',
      fileName: null,
      mimeType: null,
      fileSize: null,
      supplierId,
      staffMemberId,
      direction: 'gasto',
    });
    await entityRepository.save(document);

    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const documentRepository = new TypeOrmDocumentRepository(entityRepository, cipher);
    await expect(documentRepository.softDelete(documentId, deletedBy, new Date())).resolves.toBe(true);

    const supplierCounter = new TypeOrmSupplierReferenceCounter(dataSource);
    const staffCounter = new TypeOrmStaffPayrollCounter(dataSource);
    const projectCounter = new TypeOrmProjectDocumentCounter(dataSource);
    await expect(supplierCounter.count(supplierId)).resolves.toBe(1);
    await expect(staffCounter.count(staffMemberId)).resolves.toBe(1);
    await expect(projectCounter.count(projectId)).resolves.toBe(1);

    const supplierRepository = new TypeOrmSupplierRepository(dataSource.getRepository(SupplierOrmEntity));
    const staffRepository = new TypeOrmStaffMemberRepository(dataSource.getRepository(StaffMemberOrmEntity));
    const projectRepository = new TypeOrmProjectRepository(dataSource.getRepository(ProjectOrmEntity), cipher);
    await expect(new DeleteSupplierUseCase(supplierRepository, supplierCounter).execute(supplierId)).resolves.toBe('archived');
    await expect(new DeleteStaffMemberUseCase(staffRepository, staffCounter).execute(staffMemberId)).resolves.toBe('archived');
    await expect(new DeleteProjectUseCase(projectRepository, projectCounter).execute(projectId)).resolves.toBe('archived');

    const rows: Array<{ supplierArchived: boolean; staffArchived: boolean; projectStatus: string }> = await dataSource.query(
      `SELECT
         (SELECT archived_at IS NOT NULL FROM suppliers WHERE id = $1) AS "supplierArchived",
         (SELECT archived_at IS NOT NULL FROM staff_members WHERE id = $2) AS "staffArchived",
         (SELECT status FROM projects WHERE id = $3) AS "projectStatus"`,
      [supplierId, staffMemberId, projectId],
    );
    expect(rows[0]).toEqual({ supplierArchived: true, staffArchived: true, projectStatus: 'archived' });
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

async function selectDeletionMetadata(
  dataSource: DataSource,
  id: string,
): Promise<{ deletedBy: string; deletedAt: Date } | null> {
  const rows: Array<{ deletedBy: string; deletedAt: Date }> = await dataSource.query(
    `SELECT deleted_by AS "deletedBy", deleted_at AS "deletedAt" FROM documents WHERE id = $1`,
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
