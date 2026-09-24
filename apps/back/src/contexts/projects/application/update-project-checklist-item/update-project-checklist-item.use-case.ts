import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { PROJECT_CHECKLIST_REPOSITORY, ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { ProjectChecklist } from '../../domain/project-checklist';

export interface UpdateProjectChecklistItemCommand {
  projectId: string;
  itemId: string;
  text?: string;
  completed?: boolean;
  position?: number;
}

@Injectable()
export class UpdateProjectChecklistItemUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_REPOSITORY)
    private readonly checklists: ProjectChecklistRepository,
  ) {}

  async execute(command: UpdateProjectChecklistItemCommand): Promise<ProjectChecklist> {
    const checklist = await this.checklists.findByProjectId(command.projectId);
    if (checklist === null) throw new EntityNotFoundException('Project checklist', command.projectId);
    const changes = checklist.updateItem(command.itemId, {
      text: command.text,
      completed: command.completed,
      position: command.position,
    });
    if (!(await this.checklists.updateItem(command.projectId, command.itemId, changes))) {
      throw new EntityNotFoundException('Project checklist item', command.itemId);
    }
    const result = await this.checklists.findByProjectId(command.projectId);
    if (result === null) throw new EntityNotFoundException('Project checklist', command.projectId);
    return result;
  }
}
