import { ProjectChecklist } from '../../domain/project-checklist';

export class ProjectChecklistResponse {
  projectId: string;
  name: string;
  items: ProjectChecklist['items'];

  static fromDomain(checklist: ProjectChecklist): ProjectChecklistResponse {
    return { projectId: checklist.projectId, name: checklist.name, items: checklist.items };
  }
}
