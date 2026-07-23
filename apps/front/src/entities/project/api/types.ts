import type { ProjectColorToken } from '@/shared/config/theme';

export type ProjectTypeDto =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';

export type ProjectStatusDto = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectCurrencyDto = 'EUR' | 'USD' | 'GBP';

export interface ProjectSummaryDto {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  image?: string | null;
  color?: ProjectColorToken | null;
}

export interface ProjectDto {
  id: string;
  name: string;
  code: string;
  type: ProjectTypeDto;
  status: ProjectStatusDto;
  description?: string | null;
  clientCompany?: string | null;
  clientTaxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: ProjectCurrencyDto | null;
  fiscalYear?: string | null;
  manager?: string | null;
  image?: string | null;
  color?: ProjectColorToken | null;
}

export interface CreateProjectPayload {
  name: string;
  code: string;
  type: ProjectTypeDto;
  status?: ProjectStatusDto;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrencyDto;
  fiscalYear?: string;
  manager?: string;
  image?: string;
  color?: ProjectColorToken;
}

export interface UpdateProjectPayload {
  name?: string;
  code?: string;
  type?: ProjectTypeDto;
  status?: ProjectStatusDto;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrencyDto;
  fiscalYear?: string;
  manager?: string;
  image?: string;
  color?: ProjectColorToken;
}
