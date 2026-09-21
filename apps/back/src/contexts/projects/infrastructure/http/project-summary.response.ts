import { ProjectSummary } from '../../domain/project-summary';

export class ProjectSummaryResponse {
  id: string;
  name: string;
  code: string;
  currency: string;
  financials: ProjectSummary['financials'];
  documentCount: number;
  pendingCount: number;
  image: string | null;
  color: string | null;
  status?: ProjectSummary['status'];

  static fromSummary(summary: ProjectSummary): ProjectSummaryResponse {
    const response = new ProjectSummaryResponse();

    response.id = summary.id;
    response.name = summary.name;
    response.code = summary.code;
    response.currency = summary.currency;
    response.financials = summary.financials;
    response.documentCount = summary.documentCount;
    response.pendingCount = summary.pendingCount;
    response.image = summary.image;
    response.color = summary.color;
    if (summary.status !== undefined) {
      response.status = summary.status;
    }

    return response;
  }
}
