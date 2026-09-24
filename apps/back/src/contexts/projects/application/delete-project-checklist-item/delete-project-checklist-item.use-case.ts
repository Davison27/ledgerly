import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { PROJECT_CHECKLIST_REPOSITORY, ProjectChecklistRepository } from '../../domain/project-checklist.repository';

@Injectable()
export class DeleteProjectChecklistItemUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_REPOSITORY)
    private readonly checklists: ProjectChecklistRepository,
  ) {}

  async execute(projectId: string, itemId: string): Promise<void> {
    const checklist = await this.checklists.findByProjectId(projectId);
    if (checklist === null) throw new EntityNotFoundException('Project checklist', projectId);
    checklist.removeItem(itemId);
    if (!(await this.checklists.deleteItem(projectId, itemId))) {
      throw new EntityNotFoundException('Project checklist item', itemId);
    }
  }
}
