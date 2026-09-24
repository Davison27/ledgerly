import { DataSource, EntityManager } from 'typeorm';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';
import { TypeOrmProjectChecklistTemplateRepository } from './typeorm-project-checklist-template.repository';

function buildRepository(options: { queryRows?: unknown[][]; managerRows?: unknown[][] } = {}) {
  let queryIndex = 0;
  let managerIndex = 0;
  const query = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>()
    .mockImplementation(() => Promise.resolve(options.queryRows?.[queryIndex++] ?? []));
  const managerQuery = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>()
    .mockImplementation(() => Promise.resolve(options.managerRows?.[managerIndex++] ?? []));
  const manager = { query: managerQuery } as unknown as EntityManager;
  const transaction = jest.fn(async (callback: (transactionManager: EntityManager) => Promise<unknown>) => callback(manager));
  const dataSource = { query, manager, transaction } as unknown as DataSource;
  return { repository: new TypeOrmProjectChecklistTemplateRepository(dataSource), query, managerQuery, transaction };
}

describe('TypeOrmProjectChecklistTemplateRepository', () => {
  it('maps ordered template items into their templates', async () => {
    const { repository, query, managerQuery } = buildRepository({
      queryRows: [[{ id: 'template-1', name: 'Preparation' }]],
      managerRows: [[
        { id: 'item-1', templateId: 'template-1', text: 'First', position: 0 },
        { id: 'item-2', templateId: 'template-1', text: 'Second', position: 1 },
      ]],
    });

    await expect(repository.findAll()).resolves.toEqual([ProjectChecklistTemplate.rehydrate({
      id: 'template-1',
      name: 'Preparation',
      items: [
        { id: 'item-1', text: 'First', position: 0 },
        { id: 'item-2', text: 'Second', position: 1 },
      ],
    })]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name ASC'));
    expect(managerQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY template_id, position ASC'), [
      ['template-1'],
    ]);
  });

  it('locks a template while replacing its item texts and order', async () => {
    const { repository, managerQuery, transaction } = buildRepository({
      managerRows: [[{ id: 'template-1' }], [], [], []],
    });
    const template = ProjectChecklistTemplate.create({
      id: 'template-1',
      name: 'Updated',
      items: [{ id: 'new-item', text: 'Second', position: 0 }],
    });

    await expect(repository.update(template)).resolves.toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(managerQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(managerQuery.mock.calls[1]).toEqual([
      'UPDATE project_checklist_templates SET name = $1 WHERE id = $2',
      ['Updated', 'template-1'],
    ]);
    expect(managerQuery.mock.calls[2][0]).toContain('DELETE FROM project_checklist_template_items');
    expect(managerQuery.mock.calls[3][1]).toEqual(['new-item', 'template-1', 'Second', 0]);
  });
});
