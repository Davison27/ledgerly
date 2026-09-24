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
  templateRows?: Array<{ id: string; name: string }>;
  templateItems?: Array<{ id: string; text: string; position: number }>;
  checklistRows?: Array<{ projectId: string }>;
}) {
  const query = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>().mockImplementation((sql) => {
    if (sql.includes('SELECT id, archived_at')) {
      return Promise.resolve(options.clientRows ?? [{ id: clientId, archivedAt: null }]);
    }

    if (sql.includes('FROM project_checklist_templates')) {
      return Promise.resolve(options.templateRows ?? []);
    }

    if (sql.includes('FROM project_checklist_template_items')) {
      return Promise.resolve([...(options.templateItems ?? [])].sort((left, right) => left.position - right.position));
    }

    if (sql.includes('FROM project_checklists')) {
      return Promise.resolve(options.checklistRows ?? []);
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

  it('copies the template name and ordered items in the project transaction', async () => {
    const templateId = '00000000-0000-4000-8000-000000000003';
    const project = Project.create({ ...buildProject().toPrimitives(), planningEnabled: true });
    const { coordinator, query, save, transaction } = buildCoordinator({
      templateRows: [{ id: templateId, name: 'Foundation' }],
      templateItems: [
        { id: 'template-item-2', text: 'Second', position: 1 },
        { id: 'template-item-1', text: 'First', position: 0 },
      ],
    });

    await coordinator.saveProjectForActiveClient(project, templateId);

    const templateLock = query.mock.calls.findIndex(([sql]) => sql.includes('FROM project_checklist_templates'));
    const checklistCopy = query.mock.calls.findIndex(([sql]) => sql.includes('INSERT INTO project_checklists'));
    const firstItemCopy = query.mock.calls.findIndex(([sql]) => sql.includes('INSERT INTO project_checklist_items'));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(templateLock).toBeGreaterThan(0);
    expect(checklistCopy).toBeGreaterThan(templateLock);
    expect(firstItemCopy).toBeGreaterThan(checklistCopy);
    expect(query.mock.calls[checklistCopy][1]).toEqual([project.id, templateId, 'Foundation']);
    expect(query.mock.calls.find(([sql]) => sql.includes('FROM project_checklist_template_items'))?.[0]).toContain(
      'ORDER BY position ASC',
    );
    expect(query.mock.calls.slice(firstItemCopy).map(([, values]) => values?.slice(1))).toEqual([
      [project.id, 'First', 0],
      [project.id, 'Second', 1],
    ]);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rejects planning enabled without an initial checklist snapshot', async () => {
    const project = Project.create({ ...buildProject().toPrimitives(), planningEnabled: true });
    const { coordinator, query } = buildCoordinator({});

    await expect(coordinator.saveProjectForActiveClient(project)).rejects.toThrow(
      'An assigned checklist template is required when planning is enabled',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM project_checklists'),
      [project.id],
    );
  });

  it('does not replace an existing snapshot and retains it when planning is disabled', async () => {
    const templateId = '00000000-0000-4000-8000-000000000003';
    const existing = buildCoordinator({ checklistRows: [{ projectId: '00000000-0000-0000-0000-000000000002' }] });
    const enabled = Project.create({ ...buildProject().toPrimitives(), planningEnabled: true });

    await expect(existing.coordinator.saveProjectForActiveClient(enabled, templateId)).rejects.toThrow(
      'A project checklist template cannot be replaced',
    );
    expect(existing.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO project_checklists'), expect.anything());

    const disabled = Project.create({ ...buildProject().toPrimitives(), planningEnabled: false });
    const retained = buildCoordinator({ checklistRows: [{ projectId: disabled.id }] });
    await retained.coordinator.saveProjectForActiveClient(disabled);
    await retained.coordinator.saveProjectForActiveClient(enabled);
    expect(retained.query).not.toHaveBeenCalledWith(expect.stringContaining('DELETE FROM project_checklists'), expect.anything());
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
