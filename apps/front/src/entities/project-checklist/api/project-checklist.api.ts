import { del, get, patch, post, put } from '@/shared/api/httpClient';
import { mapProjectChecklist, mapProjectChecklistTemplate } from '../model/projectChecklistMappers';
import type {
  CreateProjectChecklistTemplatePayload,
  ProjectChecklistDto,
  ProjectChecklistTemplateDto,
  UpdateProjectChecklistItemPayload,
  UpdateProjectChecklistTemplatePayload,
} from './types';

export async function listProjectChecklistTemplates(): Promise<ProjectChecklistTemplateDto[]> {
  return (await get<ProjectChecklistTemplateDto[]>('/project-checklist-templates')).map(
    mapProjectChecklistTemplate,
  );
}

export async function getProjectChecklistTemplate(id: string): Promise<ProjectChecklistTemplateDto> {
  return mapProjectChecklistTemplate(
    await get<ProjectChecklistTemplateDto>(`/project-checklist-templates/${id}`),
  );
}

export async function createProjectChecklistTemplate(
  payload: CreateProjectChecklistTemplatePayload,
): Promise<ProjectChecklistTemplateDto> {
  return mapProjectChecklistTemplate(
    await post<ProjectChecklistTemplateDto>('/project-checklist-templates', payload),
  );
}

export async function updateProjectChecklistTemplate(
  id: string,
  payload: UpdateProjectChecklistTemplatePayload,
): Promise<ProjectChecklistTemplateDto> {
  return mapProjectChecklistTemplate(
    await put<ProjectChecklistTemplateDto>(`/project-checklist-templates/${id}`, payload),
  );
}

export function deleteProjectChecklistTemplate(id: string): Promise<void> {
  return del<void>(`/project-checklist-templates/${id}`);
}

export async function getProjectChecklist(projectId: string): Promise<ProjectChecklistDto> {
  return mapProjectChecklist(
    await get<ProjectChecklistDto>(`/projects/${projectId}/checklist`),
  );
}

export async function addProjectChecklistItem(
  projectId: string,
  text: string,
): Promise<ProjectChecklistDto> {
  return mapProjectChecklist(
    await post<ProjectChecklistDto>(`/projects/${projectId}/checklist/items`, { text }),
  );
}

export async function updateProjectChecklistItem(
  projectId: string,
  itemId: string,
  payload: UpdateProjectChecklistItemPayload,
): Promise<ProjectChecklistDto> {
  return mapProjectChecklist(
    await patch<ProjectChecklistDto>(`/projects/${projectId}/checklist/items/${itemId}`, payload),
  );
}

export function deleteProjectChecklistItem(projectId: string, itemId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/checklist/items/${itemId}`);
}
