import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';
import { CreateChecklistTemplateUseCase } from './create-checklist-template.use-case';

describe('CreateChecklistTemplateUseCase', () => {
  it('trims the name and stores ordered template items', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    let nextId = 0;
    const useCase = new CreateChecklistTemplateUseCase(
      { create } as unknown as ProjectChecklistTemplateRepository,
      { generate: () => `id-${++nextId}` },
    );

    const result = await useCase.execute({ name: ' Preparation ', items: [' First ', 'Second'] });

    expect(result).toBeInstanceOf(ProjectChecklistTemplate);
    expect(result.toPrimitives()).toEqual({
      id: 'id-1',
      name: 'Preparation',
      items: [
        { id: 'id-2', text: 'First', position: 0 },
        { id: 'id-3', text: 'Second', position: 1 },
      ],
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects blank names and item text', async () => {
    const useCase = new CreateChecklistTemplateUseCase(
      { create: jest.fn() } as unknown as ProjectChecklistTemplateRepository,
      { generate: () => 'id' },
    );

    await expect(useCase.execute({ name: '  ', items: [] })).rejects.toBeInstanceOf(InvalidValueException);
    await expect(useCase.execute({ name: 'Valid', items: ['  '] })).rejects.toBeInstanceOf(InvalidValueException);
  });
});
