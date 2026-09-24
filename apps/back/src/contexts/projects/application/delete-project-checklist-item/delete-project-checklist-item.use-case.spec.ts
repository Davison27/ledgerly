import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { ProjectChecklist } from '../../domain/project-checklist';
import { ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { DeleteProjectChecklistItemUseCase } from './delete-project-checklist-item.use-case';

describe('DeleteProjectChecklistItemUseCase', () => {
  it('deletes an item that belongs to the enabled checklist', async () => {
    const checklist = ProjectChecklist.create({
      projectId: 'project-1', sourceTemplateId: null, name: 'Plan',
      items: [{ id: 'item-1', text: 'Prepare', position: 0, completed: false }],
    });
    const repository = {
      findByProjectId: jest.fn().mockResolvedValue(checklist),
      deleteItem: jest.fn().mockResolvedValue(true),
    } as unknown as ProjectChecklistRepository;
    await expect(new DeleteProjectChecklistItemUseCase(repository).execute('project-1', 'item-1'))
      .resolves.toBeUndefined();
  });

  it('rejects an item from another or missing checklist', async () => {
    const repository = {
      findByProjectId: jest.fn().mockResolvedValue(
        ProjectChecklist.create({ projectId: 'project-1', sourceTemplateId: null, name: 'Plan', items: [] }),
      ),
    } as unknown as ProjectChecklistRepository;
    await expect(new DeleteProjectChecklistItemUseCase(repository).execute('project-1', 'missing'))
      .rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
