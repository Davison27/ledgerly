import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { GetChecklistTemplateUseCase } from './get-checklist-template.use-case';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';

describe('GetChecklistTemplateUseCase', () => {
  it('returns the requested checklist template', async () => {
    const template = { id: 'template-1', name: 'Preparation', items: [] };
    const repository = { findById: jest.fn().mockResolvedValue(template) } as unknown as ProjectChecklistTemplateRepository;

    await expect(new GetChecklistTemplateUseCase(repository).execute(template.id)).resolves.toEqual(template);
  });

  it('rejects a missing checklist template', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) } as unknown as ProjectChecklistTemplateRepository;

    await expect(new GetChecklistTemplateUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
