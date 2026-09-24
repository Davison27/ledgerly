import { ProjectChecklist, ProjectChecklistItem } from './project-checklist';

export const PROJECT_CHECKLIST_REPOSITORY = Symbol('ProjectChecklistRepository');

export interface ProjectChecklistRepository {
  findByProjectId(projectId: string): Promise<ProjectChecklist | null>;
  addItem(projectId: string, item: ProjectChecklistItem): Promise<boolean>;
  updateItem(
    projectId: string,
    itemId: string,
    changes: Partial<Pick<ProjectChecklistItem, 'text' | 'completed' | 'position'>>,
  ): Promise<boolean>;
  deleteItem(projectId: string, itemId: string): Promise<boolean>;
}
