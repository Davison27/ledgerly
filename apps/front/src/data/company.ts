import { getCompany, updateCompany as updateCompanyRequest } from './api/company.api';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject as updateProjectRequest,
} from './api/projects.api';
import type {
  CompanyDto,
  CreateProjectPayload,
  ProjectDto,
  ProjectSummaryDto,
  UpdateCompanyPayload,
  UpdateProjectPayload,
} from './api/types';

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
}

export type ProjectFormValues = Omit<Project, 'id' | 'documentCount' | 'pendingCount'>;

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  logo?: string;
  brandColor?: string;
}

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
  };
}

function mapCompany(dto: CompanyDto): Company {
  return {
    id: dto.id,
    name: dto.name,
    legalName: dto.legalName ?? undefined,
    taxId: dto.taxId ?? undefined,
    sector: dto.sector ?? undefined,
    email: dto.email ?? undefined,
    phone: dto.phone ?? undefined,
    website: dto.website ?? undefined,
    address: dto.address ?? undefined,
    city: dto.city ?? undefined,
    postalCode: dto.postalCode ?? undefined,
    country: dto.country ?? undefined,
    logo: dto.logo ?? undefined,
    brandColor: dto.brandColor ?? undefined,
  };
}

export async function fetchCompany(): Promise<Company> {
  const dto = await getCompany();
  return mapCompany(dto);
}

/**
 * Whether the given company still needs the first-run onboarding wizard.
 * Today this is a single-tenant check (no company saved yet), but kept as
 * one function so it can later become user/tenant-scoped without touching
 * every call site.
 */
export function companyNeedsSetup(company: Company): boolean {
  return !company.id;
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
  };
  const dto = await updateProjectRequest(projectId, payload);
  return mapProject(dto);
}

export async function removeProject(projectId: string): Promise<void> {
  await deleteProject(projectId);
}

export async function updateCompany(patch: Partial<Omit<Company, 'id'>>): Promise<Company> {
  const payload: UpdateCompanyPayload = { ...patch };
  const dto = await updateCompanyRequest(payload);
  return mapCompany(dto);
}
