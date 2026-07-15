import { USE_MOCKS } from '../config';
import { listProjects } from './api/projects.api';
import type { ProjectSummaryDto } from './api/types';
import { mockCompany, mockProjects, type Company, type Project } from './mocks/company.mock';

export type {
  Company,
  Project,
  ProjectType,
  ProjectStatus,
  ProjectCurrency,
  ProjectFormValues,
} from './mocks/company.mock';

export const company: Company = mockCompany;

export const initialProjects = USE_MOCKS ? mockProjects : [];

function mapProjectSummary(dto: ProjectSummaryDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    documentCount: dto.documentCount,
    pendingCount: dto.pendingCount,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const dtos = await listProjects();
  return dtos.map(mapProjectSummary);
}
