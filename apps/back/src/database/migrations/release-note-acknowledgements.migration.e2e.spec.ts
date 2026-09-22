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
import { RemoveProjectFiscalYear1730000010000 } from './1730000010000-RemoveProjectFiscalYear';
import { RequireProjectClient1730000011000 } from './1730000011000-RequireProjectClient';
import { CreateReleaseNoteAcknowledgements1730000012000 } from './1730000012000-CreateReleaseNoteAcknowledgements';

const migrations: Array<new () => MigrationInterface> = [
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
  CreateReleaseNoteAcknowledgements1730000012000,
];

const memberId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const secondMemberId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

describe('CreateReleaseNoteAcknowledgements1730000012000', () => {
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

  it('rejects orphaned acknowledgements and invalid stable versions', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO release_note_acknowledgements (workspace_member_id, release_version, acknowledged_at)
         VALUES ($1, '1.1.0', CURRENT_TIMESTAMP)`,
        [memberId],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503', constraint: 'FK_release_note_acknowledgements_workspace_member' } });

    await insertMember(dataSource, memberId);

    await expect(
      dataSource.query(
        `INSERT INTO release_note_acknowledgements (workspace_member_id, release_version, acknowledged_at)
         VALUES ($1, '01.1.0', CURRENT_TIMESTAMP)`,
        [memberId],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23514', constraint: 'CHK_release_note_acknowledgements_version' } });

    await expect(
      dataSource.query(
        `INSERT INTO release_note_acknowledgements (workspace_member_id, release_version, acknowledged_at)
         VALUES ($1, '1.1.0-rc.1', CURRENT_TIMESTAMP)`,
        [memberId],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23514', constraint: 'CHK_release_note_acknowledgements_version' } });
  });

  it('uses the composite primary key and cascades when a member is physically deleted', async () => {
    await insertMember(dataSource, memberId);
    await insertMember(dataSource, secondMemberId);
    await dataSource.query(
      `INSERT INTO release_note_acknowledgements (workspace_member_id, release_version, acknowledged_at)
       VALUES ($1, '1.1.0', '2026-09-22T10:00:00.000Z'), ($2, '1.1.0', '2026-09-22T10:00:00.000Z'),
              ($1, '1.2.0', '2026-09-22T10:00:00.000Z')`,
      [memberId, secondMemberId],
    );

    await expect(
      dataSource.query(
        `INSERT INTO release_note_acknowledgements (workspace_member_id, release_version, acknowledged_at)
         VALUES ($1, '1.1.0', '2026-09-22T11:00:00.000Z')`,
        [memberId],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505', constraint: 'PK_release_note_acknowledgements' } });

    await dataSource.query('DELETE FROM workspace_members WHERE id = $1', [memberId]);

    const rows: Array<{ workspaceMemberId: string; releaseVersion: string }> = await dataSource.query(
      `SELECT workspace_member_id AS "workspaceMemberId", release_version AS "releaseVersion"
       FROM release_note_acknowledgements ORDER BY workspace_member_id, release_version`,
    );

    expect(rows).toEqual([{ workspaceMemberId: secondMemberId, releaseVersion: '1.1.0' }]);
  });

  it('reverts and reapplies only the acknowledgement table', async () => {
    await dataSource.undoLastMigration({ transaction: 'each' });

    const tableRows: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = ANY($1) ORDER BY table_name`,
      [['release_note_acknowledgements', 'workspace_members']],
    );

    expect(tableRows).toEqual([{ tableName: 'workspace_members' }]);

    await dataSource.runMigrations({ transaction: 'each' });

    const restored: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'release_note_acknowledgements'`,
    );

    expect(restored).toEqual([{ tableName: 'release_note_acknowledgements' }]);
  });
});

async function insertMember(dataSource: DataSource, id: string): Promise<void> {
  await dataSource.query(
    `INSERT INTO workspace_members (id, email, name, role, permissions, status, is_founder, invited_at)
     VALUES ($1, $2, 'Release viewer', 'viewer', '{}'::jsonb, 'active', false, CURRENT_TIMESTAMP)`,
    [id, `${id}@ledgerly.dev`],
  );
}

function createDataSource(testDatabaseUrl: string, schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations,
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
