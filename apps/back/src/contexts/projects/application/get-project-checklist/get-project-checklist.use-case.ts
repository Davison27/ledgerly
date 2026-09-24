import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { PROJECT_CHECKLIST_REPOSITORY, ProjectChecklistRepository } from '../../domain/project-checklist.repository';
import { ProjectChecklist } from '../../domain/project-checklist';

@Injectable()
export class GetProjectChecklistUseCase {
  constructor(
    @Inject(PROJECT_CHECKLIST_REPOSITORY)
    private readonly checklists: ProjectChecklistRepository,
  ) {}

  async execute(projectId: string): Promise<ProjectChecklist> {
    const checklist = await this.checklists.findByProjectId(projectId);
    if (checklist === null) throw new EntityNotFoundException('Project checklist', projectId);
    return checklist;
  }
}
