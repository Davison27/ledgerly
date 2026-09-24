import { DataSource, EntityManager } from 'typeorm';
import { ProjectChecklist } from '../../domain/project-checklist';
import { TypeOrmProjectChecklistRepository } from './typeorm-project-checklist.repository';

function buildRepository(options: { queryRows?: unknown[][]; transactionRows?: unknown[][] } = {}) {
  let queryIndex = 0;
  let transactionIndex = 0;
  const query = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>()
    .mockImplementation(() => Promise.resolve(options.queryRows?.[queryIndex++] ?? []));
  const managerQuery = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>()
    .mockImplementation(() => Promise.resolve(options.transactionRows?.[transactionIndex++] ?? []));
  const manager = { query: managerQuery } as unknown as EntityManager;
  const transaction = jest.fn(async (callback: (transactionManager: EntityManager) => Promise<unknown>) => callback(manager));
  const dataSource = { query, transaction } as unknown as DataSource;
  return { repository: new TypeOrmProjectChecklistRepository(dataSource), query, managerQuery, transaction };
}

describe('TypeOrmProjectChecklistRepository', () => {
  it('returns ordered items only for enabled projects', async () => {
    const { repository, query } = buildRepository({
      queryRows: [[
        {
          projectId: 'project-1', sourceTemplateId: null, name: 'Preparation',
          itemId: 'item-1', text: 'First', position: 0, completed: false,
        },
        {
          projectId: 'project-1', sourceTemplateId: null, name: 'Preparation',
          itemId: 'item-2', text: 'Second', position: 1, completed: true,
        },
      ]],
    });

    await expect(repository.findByProjectId('project-1')).resolves.toEqual(ProjectChecklist.rehydrate({
      projectId: 'project-1',
      sourceTemplateId: null,
      name: 'Preparation',
      items: [
        { id: 'item-1', text: 'First', position: 0, completed: false },
        { id: 'item-2', text: 'Second', position: 1, completed: true },
      ],
    }));
    expect(query.mock.calls[0][0]).toContain('p.planning_enabled = TRUE');
  });

  it('appends new items within a locked checklist', async () => {
    const { repository, managerQuery } = buildRepository({
      transactionRows: [[{ projectId: 'project-1' }], [{ position: 2 }], []],
    });

    await expect(repository.addItem('project-1', {
      id: 'item-3', text: 'Third', position: 0, completed: false,
    })).resolves.toBe(true);
    expect(managerQuery.mock.calls[2][1]).toEqual(['item-3', 'project-1', 'Third', 2]);
  });

  it('reorders without violating the nonnegative unique position constraint', async () => {
    const { repository, managerQuery } = buildRepository({
      transactionRows: [
        [{ projectId: 'project-1' }],
        [
          { id: 'item-1', text: 'First', position: 0, completed: false },
          { id: 'item-2', text: 'Second', position: 1, completed: false },
        ],
        [{ maxPosition: 1 }],
        [],
        [],
        [],
        [],
      ],
    });

    await expect(repository.updateItem('project-1', 'item-2', { position: 0 })).resolves.toBe(true);
    expect(managerQuery.mock.calls[3][0]).toContain('position = position + $1');
    expect(managerQuery.mock.calls[3][1]).toEqual([2, 'project-1']);
    expect(managerQuery.mock.calls[4][1]).toEqual([0, 'item-2']);
    expect(managerQuery.mock.calls[5][1]).toEqual([1, 'item-1']);
  });
});
