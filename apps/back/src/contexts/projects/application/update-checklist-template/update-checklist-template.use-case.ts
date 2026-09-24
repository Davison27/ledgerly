import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import {
  PROJECT_CHECKLIST_TEMPLATE_REPOSITORY,
  ProjectChecklistTemplateRepository,
} from '../../domain/project-checklist-template.repository';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';

export interface UpdateChecklistTemplateCommand {
  id: string;
  name: string;
  items: string[];
}

@Injectable()
export class UpdateChecklistTemplateUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ProjectChecklistTemplateRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: UpdateChecklistTemplateCommand): Promise<ProjectChecklistTemplate> {
    const existing = await this.templates.findById(command.id);
    if (existing === null) throw new EntityNotFoundException('Checklist template', command.id);
    const template = existing.withChanges({
      name: command.name,
      items: command.items.map((text, position) => ({
        id: this.idGenerator.generate(),
        text,
        position,
      })),
    });
    if (!(await this.templates.update(template))) {
      throw new EntityNotFoundException('Checklist template', command.id);
    }
    return template;
  }
}
