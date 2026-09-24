import { ProjectChecklistTemplate } from './project-checklist-template';

export const PROJECT_CHECKLIST_TEMPLATE_REPOSITORY = Symbol('ProjectChecklistTemplateRepository');

export interface ProjectChecklistTemplateRepository {
  findAll(): Promise<ProjectChecklistTemplate[]>;
  findById(id: string): Promise<ProjectChecklistTemplate | null>;
  create(template: ProjectChecklistTemplate): Promise<void>;
  update(template: ProjectChecklistTemplate): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
