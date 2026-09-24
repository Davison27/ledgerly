import type { ProjectColorToken } from '@/shared/config/theme';
import type { ClientDto } from '@/entities/client/@x/project';

export type ProjectTypeDto =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';

export type ProjectStatusDto = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectCurrencyDto = 'EUR' | 'USD' | 'GBP';

export interface ProjectFinancialsDto {
  currency: string;
  income: number;
  expenses: number;
  profit: number;
  margin: number | null;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  code: string;
  currency: ProjectCurrencyDto;
  financials?: ProjectFinancialsDto[];
  documentCount?: number;
  pendingCount?: number;
  image?: string | null;
  color?: ProjectColorToken | null;
  status?: ProjectStatusDto;
  planningEnabled?: boolean;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
}

export type ProjectDeletionOutcome = 'deleted' | 'archived';

export interface ProjectDeletionOutcomeDto {
  outcome: ProjectDeletionOutcome;
}

export interface ProjectUnarchiveOutcomeDto {
  outcome: 'unarchived';
}

export interface ProjectDto {
  id: string;
  name: string;
  code: string;
  type: ProjectTypeDto;
  status: ProjectStatusDto;
  description?: string | null;
  clientId: string;
  client: ClientDto | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: ProjectCurrencyDto | null;
  manager?: string | null;
  image?: string | null;
  color?: ProjectColorToken | null;
  planningEnabled?: boolean;
  checklistAssigned?: boolean;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
}

export interface CreateProjectPayload {
  name: string;
  code: string;
  type: ProjectTypeDto;
  status?: ProjectStatusDto;
  description?: string;
  clientId: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrencyDto;
  manager?: string;
  image?: string | null;
  color?: ProjectColorToken;
  checklistTemplateId?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  code?: string;
  type?: ProjectTypeDto;
  status?: ProjectStatusDto;
  description?: string;
  clientId?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrencyDto;
  manager?: string;
  image?: string | null;
  color?: ProjectColorToken;
  planningEnabled?: boolean;
  checklistTemplateId?: string;
}

export interface UpdateProjectPlanningPayload {
  planningEnabled: boolean;
  checklistTemplateId?: string;
}
