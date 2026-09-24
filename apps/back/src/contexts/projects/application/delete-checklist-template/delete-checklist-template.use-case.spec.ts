import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';
import { DeleteChecklistTemplateUseCase } from './delete-checklist-template.use-case';

describe('DeleteChecklistTemplateUseCase', () => {
  it('deletes the requested template', async () => {
    const remove = jest.fn().mockResolvedValue(true);
    await expect(new DeleteChecklistTemplateUseCase({ delete: remove } as unknown as ProjectChecklistTemplateRepository).execute('template-1')).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith('template-1');
  });

  it('rejects a missing template', async () => {
    const useCase = new DeleteChecklistTemplateUseCase(
      { delete: jest.fn().mockResolvedValue(false) } as unknown as ProjectChecklistTemplateRepository,
    );
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
