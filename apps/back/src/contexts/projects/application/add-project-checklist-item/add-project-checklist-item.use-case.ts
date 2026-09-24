import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { PROJECT_CHECKLIST_REPOSITORY, ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { ProjectChecklist } from '../../domain/project-checklist';

@Injectable()
export class AddProjectChecklistItemUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_REPOSITORY)
    private readonly checklists: ProjectChecklistRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(projectId: string, text: string): Promise<ProjectChecklist> {
    const normalizedText = ProjectChecklist.normalizeItemText(text);
    const checklist = await this.checklists.findByProjectId(projectId);
    if (checklist === null) throw new EntityNotFoundException('Project checklist', projectId);
    const item = checklist.addItem(this.idGenerator.generate(), normalizedText);
    if (!(await this.checklists.addItem(projectId, item))) {
      throw new EntityNotFoundException('Project checklist', projectId);
    }
    const result = await this.checklists.findByProjectId(projectId);
    if (result === null) throw new EntityNotFoundException('Project checklist', projectId);
    return result;
  }
}
