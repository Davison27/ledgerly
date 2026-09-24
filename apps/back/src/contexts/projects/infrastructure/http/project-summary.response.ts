import { ProjectSummary } from '../../domain/project-summary';

export class ProjectSummaryResponse {
  id: string;
  name: string;
  code: string;
  currency: string;
  financials?: ProjectSummary['financials'];
  documentCount?: number;
  pendingCount?: number;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
  image: string | null;
  color: string | null;
  status?: ProjectSummary['status'];

  static fromSummary(
    summary: ProjectSummary,
    includeDocumentAggregates: boolean,
    includeFinancials: boolean,
    includePlanningProgress = false,
  ): ProjectSummaryResponse {
    const response = new ProjectSummaryResponse();

    response.id = summary.id;
    response.name = summary.name;
    response.code = summary.code;
    response.currency = summary.currency;
    if (includeFinancials) response.financials = summary.financials;
    if (includeDocumentAggregates) {
      response.documentCount = summary.documentCount;
      response.pendingCount = summary.pendingCount;
    }
    if (includePlanningProgress && summary.planningEnabled) {
      response.checklistCompletedCount = summary.checklistCompletedCount ?? 0;
      response.checklistTotalCount = summary.checklistTotalCount ?? 0;
    }
    response.image = summary.image;
    response.color = summary.color;
    if (summary.status !== undefined) {
      response.status = summary.status;
    }

    return response;
  }
}
