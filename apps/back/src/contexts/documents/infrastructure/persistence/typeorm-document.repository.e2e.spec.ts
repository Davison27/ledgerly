import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from '../../../../database/migrations/1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from '../../../../database/migrations/1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from '../../../../database/migrations/1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from '../../../../database/migrations/1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from '../../../../database/migrations/1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from '../../../../database/migrations/1730000005000-AddReferentialIntegrity';
import { NormalizeDerivedColumns1730000006000 } from '../../../../database/migrations/1730000006000-NormalizeDerivedColumns';
import { AdoptEnglishControlledValues1730000007000 } from '../../../../database/migrations/1730000007000-AdoptEnglishControlledValues';
import { NormalizeTaxIdsAndEnforceUniqueness1730000008000 } from '../../../../database/migrations/1730000008000-NormalizeTaxIdsAndEnforceUniqueness';
import { PreserveWorkspaceMemberAuditIdentity1730000009000 } from '../../../../database/migrations/1730000009000-PreserveWorkspaceMemberAuditIdentity';
import { RemoveProjectFiscalYear1730000010000 } from '../../../../database/migrations/1730000010000-RemoveProjectFiscalYear';
import { RequireProjectClient1730000011000 } from '../../../../database/migrations/1730000011000-RequireProjectClient';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { DeleteProjectUseCase } from '../../../projects/application/delete-project/delete-project.use-case';
import { DeleteStaffMemberUseCase } from '../../../staff/application/delete-staff-member/delete-staff-member.use-case';
import { DeleteSupplierUseCase } from '../../../suppliers/application/delete-supplier/delete-supplier.use-case';
import { TypeOrmProjectFinancialsProvider } from '../../../projects/infrastructure/persistence/typeorm-project-financials-provider';
import { DocumentOrmEntity } from './document.orm-entity';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';
import { ClientOrmEntity } from '../../../projects/infrastructure/persistence/client.orm-entity';
import { StaffMemberOrmEntity } from '../../../staff/infrastructure/persistence/staff-member.orm-entity';
import { SupplierOrmEntity } from '../../../suppliers/infrastructure/persistence/supplier.orm-entity';
import { WorkspaceMemberOrmEntity } from '../../../auth/infrastructure/persistence/workspace-member.orm-entity';
import { TypeOrmProjectPhysicalDocumentReferenceCounter } from '../../../projects/infrastructure/persistence/typeorm-project-physical-document-reference-counter';
import { TypeOrmProjectRepository } from '../../../projects/infrastructure/persistence/typeorm-project.repository';
import { TypeOrmStaffMemberRepository } from '../../../staff/infrastructure/persistence/typeorm-staff-member.repository';
import { TypeOrmStaffPhysicalDocumentReferenceCounter } from '../../../staff/infrastructure/persistence/typeorm-staff-physical-document-reference-counter';
import { TypeOrmSupplierPhysicalDocumentReferenceCounter } from '../../../suppliers/infrastructure/persistence/typeorm-supplier-physical-document-reference-counter';
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
      entities: [DocumentOrmEntity, ProjectOrmEntity, ClientOrmEntity, SupplierOrmEntity, StaffMemberOrmEntity, WorkspaceMemberOrmEntity],
      migrations: [
        InitialLedgerlySchema1730000000000,
        AddListQueryIndexes1730000001000,
        AddEncryptedStoredFileEnvelopes1730000002000,
        ReconcileEntitySchemaDrift1730000003000,
        AddMissingUniqueConstraints1730000004000,
        AddReferentialIntegrity1730000005000,
        NormalizeDerivedColumns1730000006000,
        AdoptEnglishControlledValues1730000007000,
        NormalizeTaxIdsAndEnforceUniqueness1730000008000,
        PreserveWorkspaceMemberAuditIdentity1730000009000,
        RemoveProjectFiscalYear1730000010000,
        RequireProjectClient1730000011000,
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
    await insertClient(dataSource, '00000000-0000-0000-0000-000000000201', 'B20100001');
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, client_id) VALUES ('00000000-0000-0000-0000-000000000101', 'Project', 'PROJECT-001', 'construction', '00000000-0000-0000-0000-000000000201')`,
    );
    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    const document = entityRepository.create({
      id: '00000000-0000-0000-0000-000000000001',
      projectId: '00000000-0000-0000-0000-000000000101',
      name: 'Document',
      type: 'invoice',
      date: '2026-01-01',
      amount: '0',
      status: 'pending',
      currency: 'EUR',
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      fileSize: 4,
      direction: 'income',
    });
    await entityRepository.save(document);
    const storedFileCipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const repository = new TypeOrmDocumentRepository(entityRepository, storedFileCipher);
    await insertWorkspaceMember(dataSource, '00000000-0000-0000-0000-000000000102');

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
    await insertClient(dataSource, '00000000-0000-0000-0000-000000000211', 'B21100001');
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency, client_id) VALUES ($1, 'Summary project', 'PROJECT-111', 'construction', 'EUR', $2)`,
      [projectId, '00000000-0000-0000-0000-000000000211'],
    );
    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    const document = entityRepository.create({
      id: documentId,
      projectId,
      name: 'Invoice',
      type: 'invoice',
      date: '2026-01-01',
      amount: '100',
      status: 'pending',
      currency: 'EUR',
      fileName: null,
      mimeType: null,
      fileSize: null,
      direction: 'income',
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

    await insertWorkspaceMember(dataSource, '00000000-0000-0000-0000-000000000113');
    await expect(repository.softDelete(documentId, '00000000-0000-0000-0000-000000000113', new Date())).resolves.toBe(true);

    await expect(repository.findAllForListing({})).resolves.toEqual([]);
    await expect(projectRepository.findSummaryById(projectId)).resolves.toMatchObject({
      documentCount: 0,
      pendingCount: 0,
    });
    await expect(financialsProvider.findAll()).resolves.toEqual([]);
  });

  it('filters documents through active and archived project clients with deterministic conjunction semantics', async () => {
    const clientOneId = '00000000-0000-0000-0000-000000000301';
    const clientTwoId = '00000000-0000-0000-0000-000000000302';
    const projectOneId = '00000000-0000-0000-0000-000000000303';
    const projectTwoId = '00000000-0000-0000-0000-000000000304';
    const projectOtherId = '00000000-0000-0000-0000-000000000305';
    const documentOneId = '00000000-0000-0000-0000-000000000306';
    const documentTwoId = '00000000-0000-0000-0000-000000000307';
    const otherDocumentId = '00000000-0000-0000-0000-000000000308';
    const deletedDocumentId = '00000000-0000-0000-0000-000000000309';
    const deletedBy = '00000000-0000-0000-0000-000000000310';

    await insertClient(dataSource, clientOneId, 'B30100001');
    await insertClient(dataSource, clientTwoId, 'B30200001');
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency, client_id)
       VALUES
         ($1, 'Client one project one', 'PROJECT-301', 'construction', 'EUR', $4),
         ($2, 'Client one project two', 'PROJECT-302', 'construction', 'EUR', $4),
         ($3, 'Client two project', 'PROJECT-303', 'construction', 'EUR', $5)`,
      [projectOneId, projectTwoId, projectOtherId, clientOneId, clientTwoId],
    );

    const entityRepository = dataSource.getRepository(DocumentOrmEntity);
    await entityRepository.save(
      entityRepository.create([
        buildListingDocument(documentOneId, projectOneId, 'Client one document one'),
        buildListingDocument(documentTwoId, projectTwoId, 'Client one document two'),
        buildListingDocument(otherDocumentId, projectOtherId, 'Client two document'),
        buildListingDocument(deletedDocumentId, projectOneId, 'Deleted client one document'),
      ]),
    );
    await insertWorkspaceMember(dataSource, deletedBy);

    const repository = new TypeOrmDocumentRepository(
      entityRepository,
      createStoredFileCipher({
        activeVersion: 'v1',
        keys: new Map([['v1', Buffer.alloc(32, 1)]]),
      }),
    );

    await expect(repository.findAllForListing({ clientId: clientOneId })).resolves.toEqual([
      expect.objectContaining({ id: deletedDocumentId }),
      expect.objectContaining({ id: documentTwoId }),
      expect.objectContaining({ id: documentOneId }),
    ]);
    await expect(
      repository.findPageForListing({ clientId: clientOneId }, { page: 2, size: 1 }),
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: documentTwoId })],
      total: 3,
      page: 2,
      size: 1,
    });
    await expect(
      repository.findAllForListing({ clientId: clientOneId, projectId: projectOtherId }),
    ).resolves.toEqual([]);

    await dataSource.query(`UPDATE clients SET archived_at = CURRENT_TIMESTAMP WHERE id = $1`, [clientOneId]);
    await expect(repository.findAllForListing({ clientId: clientOneId })).resolves.toHaveLength(3);

    await expect(repository.softDelete(deletedDocumentId, deletedBy, new Date())).resolves.toBe(true);
    await expect(repository.findAllForListing({ clientId: clientOneId })).resolves.toEqual([
      expect.objectContaining({ id: documentTwoId }),
      expect.objectContaining({ id: documentOneId }),
    ]);
  });

  it('archives parents that only have soft-deleted document references', async () => {
    const projectId = '00000000-0000-0000-0000-000000000121';
    const supplierId = '00000000-0000-0000-0000-000000000122';
    const staffMemberId = '00000000-0000-0000-0000-000000000123';
    const documentId = '00000000-0000-0000-0000-000000000124';
    const deletedBy = '00000000-0000-0000-0000-000000000125';
    await insertClient(dataSource, '00000000-0000-0000-0000-000000000221', 'B22100001');
    await dataSource.query(
      `INSERT INTO projects (id, name, code, type, currency, client_id) VALUES ($1, 'Referenced project', 'PROJECT-121', 'client', 'EUR', $2)`,
      [projectId, '00000000-0000-0000-0000-000000000221'],
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
      type: 'payroll',
      date: '2026-01-01',
      amount: '100',
      status: 'pending',
      currency: 'EUR',
      fileName: null,
      mimeType: null,
      fileSize: null,
      supplierId,
      staffMemberId,
      direction: 'expense',
    });
    await entityRepository.save(document);
    await insertWorkspaceMember(dataSource, deletedBy);

    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    const documentRepository = new TypeOrmDocumentRepository(entityRepository, cipher);
    await expect(documentRepository.softDelete(documentId, deletedBy, new Date())).resolves.toBe(true);

    const supplierCounter = new TypeOrmSupplierPhysicalDocumentReferenceCounter(dataSource);
    const staffCounter = new TypeOrmStaffPhysicalDocumentReferenceCounter(dataSource);
    const projectCounter = new TypeOrmProjectPhysicalDocumentReferenceCounter(dataSource);
    await expect(supplierCounter.countPhysicalDocumentReferences(supplierId)).resolves.toBe(1);
    await expect(staffCounter.countPhysicalDocumentReferences(staffMemberId)).resolves.toBe(1);
    await expect(projectCounter.countPhysicalDocumentReferences(projectId)).resolves.toBe(1);

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

function buildListingDocument(id: string, projectId: string, name: string): Partial<DocumentOrmEntity> {
  return {
    id,
    projectId,
    name,
    type: 'invoice',
    date: '2026-01-01',
    amount: '100',
    status: 'pending',
    currency: 'EUR',
    fileName: null,
    mimeType: null,
    fileSize: null,
    direction: 'income',
  };
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

async function insertWorkspaceMember(dataSource: DataSource, id: string): Promise<void> {
  await dataSource.query(
    `INSERT INTO workspace_members (
       id, email, name, role, permissions, status, is_founder, invited_at
     ) VALUES ($1, $2, 'Audit member', 'viewer', '{}'::jsonb, 'active', false, CURRENT_TIMESTAMP)`,
    [id, `${id}@ledgerly.dev`],
  );
}

async function insertClient(dataSource: DataSource, id: string, taxId: string): Promise<void> {
  await dataSource.query(
    `INSERT INTO clients (id, name, tax_id) VALUES ($1, $2, $3)`,
    [id, `Client ${id}`, taxId],
  );
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
