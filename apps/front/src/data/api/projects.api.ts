import { del, get, post } from './httpClient';
import { stripEmpty } from './sanitize';
import type { CreateProjectPayload, ProjectDto, ProjectSummaryDto } from './types';

export function listProjects(): Promise<ProjectSummaryDto[]> {
  return get<ProjectSummaryDto[]>('/projects');
}

export function createProject(payload: CreateProjectPayload): Promise<ProjectDto> {
  return post<ProjectDto>('/projects', stripEmpty(payload));
}

export function deleteProject(projectId: string): Promise<void> {
  return del<void>(`/projects/${projectId}`);
}
