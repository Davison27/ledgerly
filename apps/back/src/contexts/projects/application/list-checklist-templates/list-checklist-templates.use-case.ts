import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_CHECKLIST_TEMPLATE_REPOSITORY,
  ProjectChecklistTemplateRepository,
} from '../../domain/project-checklist-template.repository';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';

@Injectable()
export class ListChecklistTemplatesUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ProjectChecklistTemplateRepository,
  ) {}

  execute(): Promise<ProjectChecklistTemplate[]> {
    return this.templates.findAll();
  }
}
