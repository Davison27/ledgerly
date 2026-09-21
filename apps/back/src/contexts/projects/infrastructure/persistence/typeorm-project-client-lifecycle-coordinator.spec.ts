import { DataSource, EntityManager } from 'typeorm';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ClientArchivedException } from '../../domain/errors/client-archived.exception';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { Project } from '../../domain/project';
import { TypeOrmProjectClientLifecycleCoordinator } from './typeorm-project-client-lifecycle-coordinator';
import { ProjectOrmEntity } from './project.orm-entity';

const clientId = '00000000-0000-4000-8000-000000000001';

function buildProject(): Project {
  return Project.create({
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Project',
    code: 'PROJECT-001',
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

function buildCoordinator(options: {
  clientRows?: Array<{ id: string; archivedAt: Date | null }>;
  projectCount?: number;
}) {
  const query = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, archived_at')) {
      return Promise.resolve(options.clientRows ?? [{ id: clientId, archivedAt: null }]);
    }

    if (sql.includes('SELECT count(*)')) {
      return Promise.resolve([{ count: options.projectCount ?? 0 }]);
    }

    return Promise.resolve([]);
  });
  const save = jest.fn().mockResolvedValue(undefined);
  const manager = {
    query,
    getRepository: jest.fn().mockReturnValue({ save }),
  } as unknown as EntityManager;
  const transaction = jest.fn(async (callback: (manager: EntityManager) => Promise<unknown>) => callback(manager));
  const dataSource = { transaction } as unknown as DataSource;
  const coordinator = new TypeOrmProjectClientLifecycleCoordinator(
    dataSource,
    undefined as never,
  );

  return { coordinator, query, save, transaction };
}

describe('TypeOrmProjectClientLifecycleCoordinator', () => {
  it('locks an active client before saving a project in the transaction', async () => {
    const { coordinator, query, save, transaction } = buildCoordinator({});

    await coordinator.saveProjectForActiveClient(buildProject());

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM clients WHERE id = $1 FOR UPDATE'),
      [clientId],
    );
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      id: '00000000-0000-0000-0000-000000000002',
      clientId,
    } satisfies Partial<ProjectOrmEntity>));
  });

  it('rejects archived and missing parents without saving a project', async () => {
    const archived = buildCoordinator({ clientRows: [{ id: clientId, archivedAt: new Date() }] });
    await expect(archived.coordinator.saveProjectForActiveClient(buildProject())).rejects.toBeInstanceOf(
      ClientArchivedException,
    );
    expect(archived.save).not.toHaveBeenCalled();

    const missing = buildCoordinator({ clientRows: [] });
    await expect(missing.coordinator.saveProjectForActiveClient(buildProject())).rejects.toBeInstanceOf(
      ClientNotFoundException,
    );
    expect(missing.save).not.toHaveBeenCalled();
  });

  it('rejects malformed client identifiers before opening a transaction', async () => {
    const { coordinator, transaction } = buildCoordinator({});
    const project = Project.create({ ...buildProject().toPrimitives(), clientId: 'not-a-uuid' });

    await expect(coordinator.saveProjectForActiveClient(project)).rejects.toBeInstanceOf(
      InvalidValueException,
    );
    await expect(coordinator.deleteOrArchiveClient('not-a-uuid')).rejects.toBeInstanceOf(
      InvalidValueException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('archives a locked client with projects and deletes one without projects', async () => {
    const archived = buildCoordinator({ projectCount: 1 });
    await expect(archived.coordinator.deleteOrArchiveClient(clientId)).resolves.toBe('archived');
    expect(archived.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE clients SET archived_at = CURRENT_TIMESTAMP'),
      [clientId],
    );

    const deleted = buildCoordinator({ projectCount: 0 });
    await expect(deleted.coordinator.deleteOrArchiveClient(clientId)).resolves.toBe('deleted');
    expect(deleted.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM clients WHERE id = $1'),
      [clientId],
    );
  });
});
