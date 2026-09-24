import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ProjectChecklist } from '../../domain/project-checklist';
import { ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { AddProjectChecklistItemUseCase } from './add-project-checklist-item.use-case';

describe('AddProjectChecklistItemUseCase', () => {
  it('adds a trimmed incomplete item and returns the updated checklist', async () => {
    const checklist = ProjectChecklist.create({ projectId: 'project-1', sourceTemplateId: null, name: 'Plan', items: [] });
    const saved = ProjectChecklist.create({
      projectId: 'project-1', sourceTemplateId: null, name: 'Plan',
      items: [{ id: 'item-1', text: 'Prepare', position: 0, completed: false }],
    });
    const findByProjectId = jest.fn().mockResolvedValueOnce(checklist).mockResolvedValueOnce(saved);
    const addItem = jest.fn().mockResolvedValue(true);
    const repository = { findByProjectId, addItem } as unknown as ProjectChecklistRepository;
    const useCase = new AddProjectChecklistItemUseCase(repository, { generate: () => 'item-1' });

    await expect(useCase.execute('project-1', ' Prepare ')).resolves.toEqual(saved);
    expect(addItem).toHaveBeenCalledWith('project-1', {
      id: 'item-1', text: 'Prepare', position: 0, completed: false,
    });
  });

  it('rejects blank checklist item text', async () => {
    const useCase = new AddProjectChecklistItemUseCase(
      { findByProjectId: jest.fn() } as unknown as ProjectChecklistRepository,
      { generate: () => 'id' },
    );
    await expect(useCase.execute('project-1', ' ')).rejects.toBeInstanceOf(InvalidValueException);
  });
});
