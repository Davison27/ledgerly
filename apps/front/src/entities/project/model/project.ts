import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject as updateProjectRequest,
} from '../api/projects.api';
import type {
  CreateProjectPayload,
  ProjectDto,
  ProjectFinancialsDto,
  ProjectSummaryDto,
  UpdateProjectPayload,
} from '../api/types';
import { mapClient } from '@/entities/client/@x/project';
import type { Client } from '@/entities/client/@x/project';
import type { ProjectColorToken } from '@/shared/config/theme';

export type { ProjectColorToken };

export type ProjectType =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectCurrency = 'EUR' | 'USD' | 'GBP';

export interface ProjectFinancials {
  currency: string;
  income: number;
  expenses: number;
  profit: number;
  margin: number | null;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  financials?: ProjectFinancials[];
  type?: ProjectType;
  status?: ProjectStatus;
  description?: string;
  clientId?: string;
  client?: Client | null;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrency;
  manager?: string;
  image?: string | null;
  color?: ProjectColorToken;
}

export type ProjectFormValues = Omit<
  Project,
  'id' | 'documentCount' | 'pendingCount' | 'financials' | 'client' | 'clientId'
> & { clientId: string };

export type ProjectUpdateValues = Partial<ProjectFormValues>;

function mapProjectFinancials(dto: ProjectFinancialsDto): ProjectFinancials {
  return {
    currency: dto.currency,
    income: dto.income,
    expenses: dto.expenses,
    profit: dto.profit,
    margin: dto.margin,
  };
}

function mapProjectSummary(dto: ProjectSummaryDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    currency: dto.currency,
    financials: dto.financials.map(mapProjectFinancials),
    documentCount: dto.documentCount,
    pendingCount: dto.pendingCount,
    image: dto.image ?? undefined,
    color: dto.color ?? undefined,
    status: dto.status,
  };
}

function mapProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    documentCount: 0,
    pendingCount: 0,
    type: dto.type,
    status: dto.status,
    description: dto.description ?? undefined,
    clientId: dto.clientId,
    client: dto.client ? mapClient(dto.client) : null,
    address: dto.address ?? undefined,
    startDate: dto.startDate ?? undefined,
    endDate: dto.endDate ?? undefined,
    budget: dto.budget ?? undefined,
    currency: dto.currency ?? undefined,
    manager: dto.manager ?? undefined,
    image: dto.image ?? undefined,
    color: dto.color ?? undefined,
  };
}

export async function fetchProjects(clientId?: string): Promise<Project[]> {
  const dtos = await listProjects(clientId);
  return dtos.map(mapProjectSummary);
}

export async function fetchProject(id: string): Promise<Project> {
  const dto = await getProject(id);
  return mapProject(dto);
}

export async function addProject(values: ProjectFormValues): Promise<Project> {
  const payload: CreateProjectPayload = {
    name: values.name,
    code: values.code,
    type: values.type ?? 'other',
    status: values.status,
    description: values.description,
    clientId: values.clientId,
    address: values.address,
    startDate: values.startDate,
    endDate: values.endDate,
    budget: values.budget,
    currency: values.currency,
    manager: values.manager,
    image: values.image,
    color: values.color,
  };
  const dto = await createProject(payload);
  return mapProject(dto);
}

export async function updateProject(
  projectId: string,
  values: ProjectUpdateValues,
): Promise<Project> {
  const payload: UpdateProjectPayload = {
    name: values.name,
    code: values.code,
    type: values.type,
    status: values.status,
    description: values.description,
    ...(values.clientId === undefined ? {} : { clientId: values.clientId }),
    address: values.address,
    startDate: values.startDate,
    endDate: values.endDate,
    budget: values.budget,
    currency: values.currency,
    manager: values.manager,
    image: values.image,
    color: values.color,
  };
  const dto = await updateProjectRequest(projectId, payload);
  return mapProject(dto);
}

export async function removeProject(projectId: string): Promise<'deleted' | 'archived'> {
  const { outcome } = await deleteProject(projectId);
  return outcome;
}
