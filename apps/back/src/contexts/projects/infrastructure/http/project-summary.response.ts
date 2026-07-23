import { ProjectSummary } from '../../domain/project-summary';

export class ProjectSummaryResponse {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  image: string | null;
  color: string | null;
  isDemo: boolean;

  static fromSummary(summary: ProjectSummary): ProjectSummaryResponse {
    const response = new ProjectSummaryResponse();

    response.id = summary.id;
    response.name = summary.name;
    response.code = summary.code;
    response.documentCount = summary.documentCount;
    response.pendingCount = summary.pendingCount;
    response.image = summary.image;
    response.color = summary.color;
    response.isDemo = summary.isDemo ?? false;

    return response;
  }
}
