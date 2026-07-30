import { del, get, post } from '@/shared/api/httpClient';
import type { ProjectProductDto, SaveProjectProductPayload } from './types';

export function listProjectProducts(projectId: string): Promise<ProjectProductDto[]> {
  return get<ProjectProductDto[]>(`/projects/${projectId}/products`);
}

export function saveProjectProduct(projectId: string, payload: SaveProjectProductPayload): Promise<ProjectProductDto[]> {
  return post<ProjectProductDto[]>(`/projects/${projectId}/products`, payload);
}

export function deleteProjectProduct(projectId: string, productId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/products/${productId}`);
}
