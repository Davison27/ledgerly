import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, MigrationInterface } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from './1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from './1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from './1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from './1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from './1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from './1730000005000-AddReferentialIntegrity';
import { NormalizeDerivedColumns1730000006000 } from './1730000006000-NormalizeDerivedColumns';
import { AdoptEnglishControlledValues1730000007000 } from './1730000007000-AdoptEnglishControlledValues';
import { NormalizeTaxIdsAndEnforceUniqueness1730000008000 } from './1730000008000-NormalizeTaxIdsAndEnforceUniqueness';
import { PreserveWorkspaceMemberAuditIdentity1730000009000 } from './1730000009000-PreserveWorkspaceMemberAuditIdentity';

const baseMigrations: Array<new () => MigrationInterface> = [
  InitialLedgerlySchema1730000000000,
  AddListQueryIndexes1730000001000,
  AddEncryptedStoredFileEnvelopes1730000002000,
  ReconcileEntitySchemaDrift1730000003000,
  AddMissingUniqueConstraints1730000004000,
  AddReferentialIntegrity1730000005000,
  NormalizeDerivedColumns1730000006000,
  AdoptEnglishControlledValues1730000007000,
  NormalizeTaxIdsAndEnforceUniqueness1730000008000,
];

const actorId = '00000000-0000-0000-0000-000000000901';
const retainedMemberId = '00000000-0000-0000-0000-000000000902';
const danglingActorId = '00000000-0000-0000-0000-000000000903';
const projectId = '00000000-0000-0000-0000-000000000904';
const validDocumentId = '00000000-0000-0000-0000-000000000905';
const danglingDocumentId = '00000000-0000-0000-0000-000000000906';
const uploadedDocumentId = '00000000-0000-0000-0000-000000000907';
const softDeletedDocumentId = '00000000-0000-0000-0000-000000000908';

describe('PreserveWorkspaceMemberAuditIdentity1730000009000', () => {
  let dataSource: DataSource;
  let schema: string;
  let testDatabaseUrl: string;

  beforeEach(async () => {
    testDatabaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;

    const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = createDataSource(testDatabaseUrl, schema);
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
    await insertFixtures(dataSource);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();

    if (schema && testDatabaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('backfills dangling audit IDs to null and preserves valid actors', async () => {
    await invokeMigration('up');

    await expect(dataSource.query(
      `SELECT created_by AS "createdBy", deleted_by AS "deletedBy"
       FROM documents WHERE id = $1`,
      [validDocumentId],
    )).resolves.toEqual([{ createdBy: actorId, deletedBy: actorId }]);
    await expect(dataSource.query(
      `SELECT created_by AS "createdBy", deleted_by AS "deletedBy"
       FROM documents WHERE id = $1`,
      [danglingDocumentId],
    )).resolves.toEqual([{ createdBy: null, deletedBy: null }]);
  });

  it('adds indexed restrict foreign keys and retains uploaded and soft-deleted audit references', async () => {
    await invokeMigration('up');

    const indexes: Array<{ name: string }> = await dataSource.query(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)
       ORDER BY indexname`,
      [['IDX_documents_created_by', 'IDX_documents_deleted_by']],
    );
    const foreignKeys: Array<{ name: string; deleteAction: string }> = await dataSource.query(
      `SELECT conname AS name, confdeltype AS "deleteAction"
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)
       ORDER BY conname`,
      [['FK_documents_created_by_workspace_member', 'FK_documents_deleted_by_workspace_member']],
    );

    expect(indexes.map((row) => row.name)).toEqual(['IDX_documents_created_by', 'IDX_documents_deleted_by']);
    expect(foreignKeys).toEqual([
      { name: 'FK_documents_created_by_workspace_member', deleteAction: 'r' },
      { name: 'FK_documents_deleted_by_workspace_member', deleteAction: 'r' },
    ]);

    await expect(dataSource.query(
      `INSERT INTO documents (id, project_id, name, type, date, amount, status, currency, direction, created_by)
       VALUES ($1, $2, 'Invalid actor', 'invoice', '2026-01-01', 1, 'pending', 'EUR', 'income', $3)`,
      ['00000000-0000-0000-0000-000000000909', projectId, danglingActorId],
    )).rejects.toThrow();
    await expect(dataSource.query(`DELETE FROM workspace_members WHERE id = $1`, [actorId])).rejects.toThrow();

    await dataSource.query(
      `INSERT INTO documents (id, project_id, name, type, date, amount, status, currency, direction, created_by)
       VALUES ($1, $2, 'Uploaded', 'invoice', '2026-01-01', 1, 'pending', 'EUR', 'income', $3)`,
      [uploadedDocumentId, projectId, retainedMemberId],
    );
    await dataSource.query(
      `INSERT INTO documents (id, project_id, name, type, date, amount, status, currency, direction, created_by, deleted_by, deleted_at)
       VALUES ($1, $2, 'Soft deleted', 'invoice', '2026-01-02', 1, 'pending', 'EUR', 'income', $3, $3, CURRENT_TIMESTAMP)`,
      [softDeletedDocumentId, projectId, retainedMemberId],
    );
    await expect(dataSource.query(
      `SELECT count(*)::int AS count
       FROM documents
       WHERE created_by = $1 OR deleted_by = $1`,
      [retainedMemberId],
    )).resolves.toEqual([{ count: 2 }]);
  });

  it('removes and reapplies only the audit foreign keys and indexes', async () => {
    await invokeMigration('up');
    await invokeMigration('down');

    await expect(dataSource.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1)`,
      [['IDX_documents_created_by', 'IDX_documents_deleted_by']],
    )).resolves.toHaveLength(0);
    await expect(dataSource.query(
      `SELECT conname FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)`,
      [['FK_documents_created_by_workspace_member', 'FK_documents_deleted_by_workspace_member']],
    )).resolves.toHaveLength(0);
    await expect(dataSource.query(
      'SELECT created_by AS "createdBy", deleted_by AS "deletedBy" FROM documents WHERE id = $1',
      [validDocumentId],
    )).resolves.toEqual([{ createdBy: actorId, deletedBy: actorId }]);

    await invokeMigration('up');
    await expect(dataSource.query(
      `SELECT conname FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
         AND conname = ANY($1)
       ORDER BY conname`,
      [['FK_documents_created_by_workspace_member', 'FK_documents_deleted_by_workspace_member']],
    )).resolves.toEqual([
      { conname: 'FK_documents_created_by_workspace_member' },
      { conname: 'FK_documents_deleted_by_workspace_member' },
    ]);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new PreserveWorkspaceMemberAuditIdentity1730000009000();
      if (direction === 'up') await migration.up(queryRunner);
      else await migration.down(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
});

async function insertFixtures(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO workspace_members (id, email, name, role, permissions, status, is_founder, invited_at)
     VALUES
       ($1, $2, 'Audit actor', 'viewer', '{}'::jsonb, 'active', false, CURRENT_TIMESTAMP),
       ($3, $4, 'Retained member', 'viewer', '{}'::jsonb, 'disabled', false, CURRENT_TIMESTAMP)`,
    [actorId, `${actorId}@ledgerly.dev`, retainedMemberId, `${retainedMemberId}@ledgerly.dev`],
  );
  await dataSource.query(
    `INSERT INTO projects (id, name, code, type, currency)
     VALUES ($1, 'Audit project', 'AUDIT-PROJECT', 'client', 'EUR')`,
    [projectId],
  );
  await dataSource.query(
    `INSERT INTO documents (id, project_id, name, type, date, amount, status, currency, direction, created_by, deleted_by)
     VALUES
       ($1, $3, 'Valid audit', 'invoice', '2026-01-01', 1, 'pending', 'EUR', 'income', $4, $4),
       ($2, $3, 'Dangling audit', 'invoice', '2026-01-02', 1, 'pending', 'EUR', 'income', $5, $5)`,
    [validDocumentId, danglingDocumentId, projectId, actorId, danglingActorId],
  );
}

function createDataSource(testDatabaseUrl: string, schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations: baseMigrations,
    migrationsTransactionMode: 'each',
    extra: { max: 1, options: `-c search_path=${schema},public` },
  });
}

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid migration test database URL');

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
