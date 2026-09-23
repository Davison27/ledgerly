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
import { ConvertWorkspaceMemberRoles1730000013000 } from './1730000013000-ConvertWorkspaceMemberRoles';

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
  ConvertWorkspaceMemberRoles1730000013000,
];

const legacyMigrations = migrations.slice(0, -1);
const ADMIN_MATRIX = {
  dashboard: 'view',
  projects: 'edit',
  calendar: 'edit',
  documents: 'edit',
  suppliers: 'edit',
  equipment: 'edit',
  staff: 'edit',
};
const EDITOR_MATRIX = { ...ADMIN_MATRIX, staff: 'view' };
const VIEWER_MATRIX = {
  dashboard: 'view',
  projects: 'view',
  calendar: 'view',
  documents: 'view',
  suppliers: 'view',
  equipment: 'view',
  staff: 'view',
};
const CUSTOM_MATRIX = {
  dashboard: 'none',
  projects: 'view',
  calendar: 'none',
  documents: 'edit',
  suppliers: 'none',
  equipment: 'none',
  staff: 'none',
};

describe('ConvertWorkspaceMemberRoles1730000013000', () => {
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

  it('converts legacy roles without changing their permission matrices and safely restores them', async () => {
    const expected = [
      { name: 'admin', role: 'admin', permissions: ADMIN_MATRIX },
      { name: 'custom', role: 'custom', permissions: CUSTOM_MATRIX },
      { name: 'editor', role: 'editor', permissions: EDITOR_MATRIX },
      { name: 'viewer', role: 'viewer', permissions: VIEWER_MATRIX },
    ];

    for (const { name, role, permissions } of expected) {
      await insertMember(dataSource, role, name, permissions);
    }

    await invokeMigration('up');

    const migrated: Array<{ name: string; role: string; permissions: Record<string, string> }> =
      await dataSource.query(`SELECT name, role, permissions FROM workspace_members ORDER BY name`);

    expect(migrated).toEqual([
      { name: 'admin', role: 'admin', permissions: ADMIN_MATRIX },
      { name: 'custom', role: 'member', permissions: CUSTOM_MATRIX },
      { name: 'editor', role: 'member', permissions: EDITOR_MATRIX },
      { name: 'viewer', role: 'member', permissions: VIEWER_MATRIX },
    ]);

    await invokeMigration('down');

    const restored: Array<{ name: string; role: string; permissions: Record<string, string> }> =
      await dataSource.query(`SELECT name, role, permissions FROM workspace_members ORDER BY name`);

    expect(restored).toEqual(expected);
  });

  it('refuses rollback when a member has the legacy administrator matrix', async () => {
    await invokeMigration('up');
    await insertMember(dataSource, 'member', 'admin-matrix-member', ADMIN_MATRIX);

    await expect(invokeMigration('down')).rejects.toThrow(
      'Cannot roll back workspace roles while a member has the administrator permission matrix',
    );
    await expect(readRoleConstraint()).resolves.toHaveLength(1);
  });

  it('refuses rollback when an administrator has a non-administrator matrix', async () => {
    await invokeMigration('up');
    await insertMember(dataSource, 'admin', 'restricted-admin', VIEWER_MATRIX);

    await expect(invokeMigration('down')).rejects.toThrow(
      'Cannot roll back workspace roles while an administrator has a non-administrator permission matrix',
    );
    await expect(readRoleConstraint()).resolves.toHaveLength(1);
  });

  async function readRoleConstraint(): Promise<Array<{ name: string }>> {
    return dataSource.query(
      `SELECT conname AS name FROM pg_constraint
       WHERE conrelid = 'workspace_members'::regclass AND conname = 'CHK_workspace_members_role'`,
    );
  }

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new ConvertWorkspaceMemberRoles1730000013000();
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

async function insertMember(
  dataSource: DataSource,
  role: string,
  identifier: string,
  permissions: Record<string, string>,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO workspace_members (id, email, name, role, permissions, status, is_founder, invited_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'active', false, CURRENT_TIMESTAMP)`,
    [randomUUID(), `${identifier}@ledgerly.dev`, identifier, role, JSON.stringify(permissions)],
  );
}

function createDataSource(testDatabaseUrl: string, schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations: legacyMigrations,
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
