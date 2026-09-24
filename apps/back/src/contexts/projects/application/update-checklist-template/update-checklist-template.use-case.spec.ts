import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';
import { UpdateChecklistTemplateUseCase } from './update-checklist-template.use-case';

describe('UpdateChecklistTemplateUseCase', () => {
  it('updates template name, item text, and order', async () => {
    const update = jest.fn().mockResolvedValue(true);
    let nextId = 0;
    const existing = ProjectChecklistTemplate.create({ id: 'template-1', name: 'Existing', items: [] });
    const useCase = new UpdateChecklistTemplateUseCase(
      { findById: jest.fn().mockResolvedValue(existing), update } as unknown as ProjectChecklistTemplateRepository,
      { generate: () => `new-${++nextId}` },
    );

    const result = await useCase.execute({ id: 'template-1', name: ' Updated ', items: ['Second', 'First'] });

    expect(result).toBeInstanceOf(ProjectChecklistTemplate);
    expect(result.toPrimitives()).toEqual({
      id: 'template-1',
      name: 'Updated',
      items: [
        { id: 'new-1', text: 'Second', position: 0 },
        { id: 'new-2', text: 'First', position: 1 },
      ],
    });
  });

  it('reports when the template does not exist', async () => {
    const useCase = new UpdateChecklistTemplateUseCase(
      { findById: jest.fn().mockResolvedValue(null), update: jest.fn() } as unknown as ProjectChecklistTemplateRepository,
      { generate: () => 'id' },
    );

    await expect(useCase.execute({ id: 'missing', name: 'Valid', items: [] })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('reports if the template is removed before persistence', async () => {
    const existing = ProjectChecklistTemplate.create({ id: 'template-1', name: 'Existing', items: [] });
    const useCase = new UpdateChecklistTemplateUseCase(
      {
        findById: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(false),
      } as unknown as ProjectChecklistTemplateRepository,
      { generate: () => 'new-item' },
    );

    await expect(useCase.execute({ id: 'template-1', name: 'Valid', items: [] })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
