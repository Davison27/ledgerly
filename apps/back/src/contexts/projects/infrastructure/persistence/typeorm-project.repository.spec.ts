import { Repository } from 'typeorm';
import { ProjectOrmEntity } from './project.orm-entity';
import { TypeOrmProjectRepository } from './typeorm-project.repository';

describe('TypeOrmProjectRepository checklist summaries', () => {
  it('aggregates checklist items separately from document rows', async () => {
    const query = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>().mockResolvedValue([{
      id: 'project-1',
      name: 'Project',
      code: 'PRJ-001',
      currency: 'EUR',
      status: 'active',
      planningEnabled: true,
      checklistCompletedCount: 2,
      checklistTotalCount: 5,
      imageCiphertext: null,
      imageKeyVersion: null,
      imageMimeType: null,
      imageNonce: null,
      imageSize: null,
      imageTag: null,
      color: null,
      documentCount: 3,
      pendingCount: 1,
    }]);
    const repository = new TypeOrmProjectRepository(
      { manager: { query } } as unknown as Repository<ProjectOrmEntity>,
      undefined as never,
    );

    await expect(repository.findAllSummaries()).resolves.toMatchObject([{
      id: 'project-1',
      documentCount: 3,
      pendingCount: 1,
      planningEnabled: true,
      checklistCompletedCount: 2,
      checklistTotalCount: 5,
    }]);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('FROM project_checklists pc');
    expect(sql).toContain('LEFT JOIN project_checklist_items pci');
    expect(sql).toContain('GROUP BY pc.project_id');
    expect(sql).toContain('COUNT(d.id)::int AS "documentCount"');
  });

  it('returns snapshot existence for project details independently of enabled state', async () => {
    const query = jest.fn<Promise<unknown[]>, [sql: string, values?: unknown[]]>().mockResolvedValue([{
      id: 'project-1',
      name: 'Project',
      code: 'PRJ-001',
      currency: 'EUR',
      status: 'active',
      planningEnabled: false,
      checklistAssigned: true,
      checklistCompletedCount: 0,
      checklistTotalCount: 0,
      imageCiphertext: null,
      imageKeyVersion: null,
      imageMimeType: null,
      imageNonce: null,
      imageSize: null,
      imageTag: null,
      color: null,
      documentCount: 0,
      pendingCount: 0,
    }]);
    const repository = new TypeOrmProjectRepository(
      { manager: { query } } as unknown as Repository<ProjectOrmEntity>,
      undefined as never,
    );

    await expect(repository.findSummaryById('project-1')).resolves.toMatchObject({
      planningEnabled: false,
      checklistAssigned: true,
    });
    expect(query.mock.calls[0][0]).toContain('EXISTS (SELECT 1 FROM project_checklists');
  });
});
