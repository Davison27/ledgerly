import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import {
  PROJECT_CHECKLIST_TEMPLATE_REPOSITORY,
  ProjectChecklistTemplateRepository,
} from '../../domain/project-checklist-template.repository';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';

@Injectable()
export class GetChecklistTemplateUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ProjectChecklistTemplateRepository,
  ) {}

  async execute(id: string): Promise<ProjectChecklistTemplate> {
    const template = await this.templates.findById(id);
    if (template === null) throw new EntityNotFoundException('Checklist template', id);
    return template;
  }
}
