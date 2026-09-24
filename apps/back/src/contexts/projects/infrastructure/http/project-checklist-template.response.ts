import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';

export class ProjectChecklistTemplateResponse {
  id: string;
  name: string;
  items: ProjectChecklistTemplate['items'];

  static fromDomain(template: ProjectChecklistTemplate): ProjectChecklistTemplateResponse {
    return { id: template.id, name: template.name, items: template.items };
  }
}
