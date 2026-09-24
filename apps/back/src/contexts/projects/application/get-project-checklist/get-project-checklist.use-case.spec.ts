import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { GetProjectChecklistUseCase } from './get-project-checklist.use-case';

describe('GetProjectChecklistUseCase', () => {
  it('returns the enabled project checklist', async () => {
    const checklist = { projectId: 'project-1', sourceTemplateId: null, name: 'Plan', items: [] };
    const repository = { findByProjectId: jest.fn().mockResolvedValue(checklist) } as unknown as ProjectChecklistRepository;
    await expect(new GetProjectChecklistUseCase(repository).execute('project-1')).resolves.toEqual(checklist);
  });

  it('rejects a disabled or unassigned project checklist', async () => {
    const repository = { findByProjectId: jest.fn().mockResolvedValue(null) } as unknown as ProjectChecklistRepository;
    await expect(new GetProjectChecklistUseCase(repository).execute('project-1')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
