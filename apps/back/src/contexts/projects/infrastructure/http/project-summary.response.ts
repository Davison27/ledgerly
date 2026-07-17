import { ProjectSummary } from '../../domain/project-summary';

export class ProjectSummaryResponse {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  image: string | null;

  static fromSummary(summary: ProjectSummary): ProjectSummaryResponse {
    const response = new ProjectSummaryResponse();

    response.id = summary.id;
    response.name = summary.name;
    response.code = summary.code;
    response.documentCount = summary.documentCount;
    response.pendingCount = summary.pendingCount;
    response.image = summary.image;

    return response;
  }
}
