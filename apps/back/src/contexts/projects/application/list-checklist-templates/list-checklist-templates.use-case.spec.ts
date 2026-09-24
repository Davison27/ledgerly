import { ListChecklistTemplatesUseCase } from './list-checklist-templates.use-case';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';

describe('ListChecklistTemplatesUseCase', () => {
  it('returns all checklist templates from the repository', async () => {
    const templates = [{ id: 'template-1', name: 'Preparation', items: [] }];
    const repository = { findAll: jest.fn().mockResolvedValue(templates) } as unknown as ProjectChecklistTemplateRepository;

    await expect(new ListChecklistTemplatesUseCase(repository).execute()).resolves.toEqual(templates);
  });
});
