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
  ProjectSummaryDto,
  UpdateProjectPayload,
} from '../api/types';
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

export interface Project {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  type?: ProjectType;
  status?: ProjectStatus;
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
  currency?: ProjectCurrency;
  fiscalYear?: string;
  manager?: string;
  image?: string;
  color?: ProjectColorToken;
}

export type ProjectFormValues = Omit<Project, 'id' | 'documentCount' | 'pendingCount'>;

function mapProjectSummary(dto: ProjectSummaryDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    documentCount: dto.documentCount,
    pendingCount: dto.pendingCount,
    image: dto.image ?? undefined,
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
    clientCompany: dto.clientCompany ?? undefined,
    clientTaxId: dto.clientTaxId ?? undefined,
    contactName: dto.contactName ?? undefined,
    contactEmail: dto.contactEmail ?? undefined,
    contactPhone: dto.contactPhone ?? undefined,
    address: dto.address ?? undefined,
    startDate: dto.startDate ?? undefined,
    endDate: dto.endDate ?? undefined,
    budget: dto.budget ?? undefined,
    currency: dto.currency ?? undefined,
    fiscalYear: dto.fiscalYear ?? undefined,
    manager: dto.manager ?? undefined,
    image: dto.image ?? undefined,
    color: dto.color ?? undefined,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const dtos = await listProjects();
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
    clientCompany: values.clientCompany,
    clientTaxId: values.clientTaxId,
    contactName: values.contactName,
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    address: values.address,
    startDate: values.startDate,
    endDate: values.endDate,
    budget: values.budget,
    currency: values.currency,
    fiscalYear: values.fiscalYear,
    manager: values.manager,
    image: values.image,
    color: values.color,
  };
  const dto = await createProject(payload);
  return mapProject(dto);
}

export async function updateProject(
  projectId: string,
  values: ProjectFormValues,
): Promise<Project> {
  const payload: UpdateProjectPayload = {
    name: values.name,
    code: values.code,
    type: values.type,
    status: values.status,
    description: values.description,
    clientCompany: values.clientCompany,
    clientTaxId: values.clientTaxId,
    contactName: values.contactName,
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    address: values.address,
    startDate: values.startDate,
    endDate: values.endDate,
    budget: values.budget,
    currency: values.currency,
    fiscalYear: values.fiscalYear,
    manager: values.manager,
    image: values.image,
    color: values.color,
  };
  const dto = await updateProjectRequest(projectId, payload);
  return mapProject(dto);
}

export async function removeProject(projectId: string): Promise<void> {
  await deleteProject(projectId);
}
