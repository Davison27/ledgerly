import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import {
  PROJECT_CHECKLIST_TEMPLATE_REPOSITORY,
  ProjectChecklistTemplateRepository,
} from '../../domain/project-checklist-template.repository';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';

export interface CreateChecklistTemplateCommand {
  name: string;
  items: string[];
}

@Injectable()
export class CreateChecklistTemplateUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ProjectChecklistTemplateRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateChecklistTemplateCommand): Promise<ProjectChecklistTemplate> {
    const template = ProjectChecklistTemplate.create({
      id: this.idGenerator.generate(),
      name: command.name,
      items: command.items.map((text, position) => ({
        id: this.idGenerator.generate(),
        text,
        position,
      })),
    });
    await this.templates.create(template);
    return template;
  }
}
