import { del, get, patch, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  CreateProjectPayload,
  ProjectDto,
  ProjectSummaryDto,
  UpdateProjectPayload,
} from './types';

export function listProjects(): Promise<ProjectSummaryDto[]> {
  return get<ProjectSummaryDto[]>('/projects');
}

export function getProject(id: string): Promise<ProjectDto> {
  return get<ProjectDto>(`/projects/${id}`);
}

export function createProject(payload: CreateProjectPayload): Promise<ProjectDto> {
  return post<ProjectDto>('/projects', stripEmpty(payload));
}

export function updateProject(id: string, payload: UpdateProjectPayload): Promise<ProjectDto> {
  return patch<ProjectDto>(`/projects/${id}`, stripEmpty(payload));
}

export function deleteProject(projectId: string): Promise<void> {
  return del<void>(`/projects/${projectId}`);
}
