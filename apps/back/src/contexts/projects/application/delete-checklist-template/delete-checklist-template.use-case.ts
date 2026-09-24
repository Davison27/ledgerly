import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import {
  PROJECT_CHECKLIST_TEMPLATE_REPOSITORY,
  ProjectChecklistTemplateRepository,
} from '../../domain/project-checklist-template.repository';

@Injectable()
export class DeleteChecklistTemplateUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ProjectChecklistTemplateRepository,
  ) {}

  async execute(id: string): Promise<void> {
    if (!(await this.templates.delete(id))) throw new EntityNotFoundException('Checklist template', id);
  }
}
