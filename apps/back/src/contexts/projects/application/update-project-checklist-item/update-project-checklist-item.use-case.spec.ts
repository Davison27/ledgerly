import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ProjectChecklist } from '../../domain/project-checklist';
import { ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { UpdateProjectChecklistItemUseCase } from './update-project-checklist-item.use-case';

describe('UpdateProjectChecklistItemUseCase', () => {
  it('trims text and updates the requested item fields', async () => {
    const checklist = ProjectChecklist.create({
      projectId: 'project-1', sourceTemplateId: null, name: 'Plan',
      items: [{ id: 'item-1', text: 'Prepare', position: 0, completed: false }],
    });
    const updatedChecklist = ProjectChecklist.create({
      projectId: 'project-1', sourceTemplateId: null, name: 'Plan',
      items: [{ ...checklist.items[0], text: 'Build', completed: true }],
    });
    const findByProjectId = jest.fn().mockResolvedValueOnce(checklist).mockResolvedValueOnce(updatedChecklist);
    const updateItem = jest.fn().mockResolvedValue(true);
    const repository = { findByProjectId, updateItem } as unknown as ProjectChecklistRepository;
    const useCase = new UpdateProjectChecklistItemUseCase(repository);

    await expect(useCase.execute({ projectId: 'project-1', itemId: 'item-1', text: ' Build ', completed: true }))
      .resolves.toEqual(updatedChecklist);
    expect(updateItem).toHaveBeenCalledWith('project-1', 'item-1', { text: 'Build', completed: true });
  });

  it('rejects missing fields and blank text', async () => {
    const checklist = ProjectChecklist.create({
      projectId: 'project-1', sourceTemplateId: null, name: 'Plan',
      items: [{ id: 'item-1', text: 'Prepare', position: 0, completed: false }],
    });
    const repository = { findByProjectId: jest.fn().mockResolvedValue(checklist) } as unknown as ProjectChecklistRepository;
    const useCase = new UpdateProjectChecklistItemUseCase(repository);

    await expect(useCase.execute({ projectId: 'project-1', itemId: 'item-1' })).rejects.toBeInstanceOf(
      InvalidValueException,
    );
    await expect(useCase.execute({ projectId: 'project-1', itemId: 'item-1', text: ' ' })).rejects.toBeInstanceOf(
      InvalidValueException,
    );
  });

  it('rejects items that do not belong to the project checklist', async () => {
    const repository = {
      findByProjectId: jest.fn().mockResolvedValue(
        ProjectChecklist.create({ projectId: 'project-1', sourceTemplateId: null, name: 'Plan', items: [] }),
      ),
    } as unknown as ProjectChecklistRepository;
    await expect(new UpdateProjectChecklistItemUseCase(repository).execute({
      projectId: 'project-1', itemId: 'other-item', completed: true,
    })).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
