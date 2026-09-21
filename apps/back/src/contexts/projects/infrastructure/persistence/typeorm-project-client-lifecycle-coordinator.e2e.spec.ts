import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
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
import { ClientArchivedException } from '../../domain/errors/client-archived.exception';
import { Project } from '../../domain/project';
import { ClientOrmEntity } from './client.orm-entity';
import { ProjectOrmEntity } from './project.orm-entity';
import { TypeOrmProjectClientLifecycleCoordinator } from './typeorm-project-client-lifecycle-coordinator';

const migrations = [
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
];

describe('TypeOrmProjectClientLifecycleCoordinator concurrency (PostgreSQL)', () => {
  let dataSource: DataSource;
  let schema: string;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_project_client_${randomUUID().replaceAll('-', '')}`;
    const administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    try {
      await administrator.query(`CREATE SCHEMA "${schema}"`);
    } finally {
      await administrator.destroy();
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [ProjectOrmEntity, ClientOrmEntity],
      migrations,
      migrationsTransactionMode: 'each',
      extra: { max: 6, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
  });

  afterAll(async () => {
    try {
      if (dataSource?.isInitialized) await dataSource.destroy();
    } finally {
      if (schema && databaseUrl) {
        const cleanup = new DataSource({ type: 'postgres', url: databaseUrl });
        try {
          await cleanup.initialize();
          await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          if (cleanup.isInitialized) await cleanup.destroy();
        }
      }
    }
  });

  it('archives after an assignment that wins the client row lock', async () => {
    const clientId = randomUUID();
    await insertClient(clientId, 'B31100001');
    const project = buildProject(clientId);
    const coordinator = createCoordinator();
    const blocker = await lockClient(clientId);

    const savePromise = coordinator.saveProjectForActiveClient(project);
    await waitForLockWaiters(1);
    const deletePromise = coordinator.deleteOrArchiveClient(clientId);
    await waitForLockWaiters(2);

    await release(blocker);
    await expect(savePromise).resolves.toBeUndefined();
    await expect(deletePromise).resolves.toBe('archived');
    await expect(dataSource.query('SELECT client_id FROM projects WHERE id = $1', [project.id]))
      .resolves.toEqual([{ client_id: clientId }]);
  });

  it('returns not found after deletion wins the client row lock', async () => {
    const clientId = randomUUID();
    await insertClient(clientId, 'B32200001');
    const project = buildProject(clientId);
    const coordinator = createCoordinator();
    const blocker = await lockClient(clientId);

    const deletePromise = coordinator.deleteOrArchiveClient(clientId);
    await waitForLockWaiters(1);
    const savePromise = coordinator.saveProjectForActiveClient(project);
    await waitForLockWaiters(2);

    await release(blocker);
    await expect(deletePromise).resolves.toBe('deleted');
    await expect(savePromise).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    await expect(dataSource.query('SELECT id FROM clients WHERE id = $1', [clientId])).resolves.toEqual([]);
  });

  it('archives a locked client when an existing project reference remains', async () => {
    const clientId = randomUUID();
    await insertClient(clientId, 'B33300001');
    const project = buildProject(clientId);
    const coordinator = createCoordinator();

    await expect(coordinator.saveProjectForActiveClient(project)).resolves.toBeUndefined();
    await expect(coordinator.deleteOrArchiveClient(clientId)).resolves.toBe('archived');
    await expect(dataSource.query(
      'SELECT archived_at IS NOT NULL AS "archived" FROM clients WHERE id = $1',
      [clientId],
    )).resolves.toEqual([{ archived: true }]);
    await expect(dataSource.query('SELECT id FROM projects WHERE id = $1', [project.id]))
      .resolves.toEqual([{ id: project.id }]);
  });

  it('rejects a waiting project assignment after the client is archived', async () => {
    const clientId = randomUUID();
    await insertClient(clientId, 'B34400001');
    const originalProject = buildProject(clientId);
    const waitingProject = buildProject(clientId);
    const coordinator = createCoordinator();

    await coordinator.saveProjectForActiveClient(originalProject);
    const blocker = await lockClient(clientId);
    const deletePromise = coordinator.deleteOrArchiveClient(clientId);
    await waitForLockWaiters(1);
    const savePromise = coordinator.saveProjectForActiveClient(waitingProject);
    await waitForLockWaiters(2);

    await release(blocker);
    await expect(deletePromise).resolves.toBe('archived');
    const saveError = await savePromise.then(() => null, (error: unknown) => error);
    expect(saveError).toBeInstanceOf(ClientArchivedException);
    expect(saveError).toMatchObject({ code: 'CLIENT_ARCHIVED' });
    await expect(dataSource.query(
      'SELECT archived_at IS NOT NULL AS "archived" FROM clients WHERE id = $1',
      [clientId],
    )).resolves.toEqual([{ archived: true }]);
    await expect(dataSource.query('SELECT id FROM projects WHERE id = $1', [originalProject.id]))
      .resolves.toEqual([{ id: originalProject.id }]);
    await expect(dataSource.query('SELECT id FROM projects WHERE id = $1', [waitingProject.id]))
      .resolves.toEqual([]);
  });

  function createCoordinator(): TypeOrmProjectClientLifecycleCoordinator {
    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    return new TypeOrmProjectClientLifecycleCoordinator(dataSource, cipher);
  }

  async function insertClient(clientId: string, taxId: string): Promise<void> {
    await dataSource.query(
      'INSERT INTO clients (id, name, tax_id) VALUES ($1, $2, $3)',
      [clientId, `Client ${clientId}`, taxId],
    );
  }

  async function lockClient(clientId: string): Promise<QueryRunner> {
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.query(
        'SELECT id FROM clients WHERE id = $1 FOR UPDATE',
        [clientId],
      );
      return queryRunner;
    } catch (error) {
      if (!queryRunner.isReleased) await queryRunner.release().catch(() => undefined);
      throw error;
    }
  }

  async function release(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.commitTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async function waitForLockWaiters(expected: number): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const rows: Array<{ count: number | string }> = await dataSource.query(
        `SELECT count(*)::int AS count
         FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'`,
      );
      if (Number(rows[0]?.count ?? 0) >= expected) return;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    throw new Error(`Expected ${expected} PostgreSQL lock waiters`);
  }
});

function buildProject(clientId: string): Project {
  return Project.create({
    id: randomUUID(),
    name: 'Concurrent project',
    code: `CONCURRENT-${randomUUID().slice(0, 8)}`,
    type: 'internal',
    status: 'active',
    description: null,
    clientId,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    manager: null,
    image: null,
    color: null,
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
