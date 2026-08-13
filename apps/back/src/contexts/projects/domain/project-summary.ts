import { ProjectFinancials } from './project-financials';

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
  isDemo?: boolean;
}
