import { ProjectFinancials } from './project-financials';
import { ProjectStatus } from './project-status';

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  currency: string;
  financials: ProjectFinancials[];
  documentCount: number;
  pendingCount: number;
  image: string | null;
  color: string | null;
  planningEnabled?: boolean;
  checklistAssigned?: boolean;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
  status?: ProjectStatus;
}
