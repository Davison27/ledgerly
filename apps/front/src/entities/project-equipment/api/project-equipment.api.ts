import { del, get, post } from '@/shared/api/httpClient';
import type { ProjectEquipmentDto, SaveProjectEquipmentPayload } from './types';

export function listProjectEquipment(projectId: string): Promise<ProjectEquipmentDto[]> {
  return get<ProjectEquipmentDto[]>(`/projects/${projectId}/equipment`);
}

export function saveProjectEquipment(
  projectId: string,
  payload: SaveProjectEquipmentPayload,
): Promise<ProjectEquipmentDto[]> {
  return post<ProjectEquipmentDto[]>(`/projects/${projectId}/equipment`, payload);
}

export function deleteProjectEquipment(projectId: string, equipmentId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/equipment/${equipmentId}`);
}

export function deleteProjectLeaseExpense(
  projectId: string,
  equipmentId: string,
  expenseId: string,
): Promise<void> {
  return del<void>(`/projects/${projectId}/equipment/${equipmentId}/lease-expenses/${expenseId}`);
}
