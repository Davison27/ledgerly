import { API_URL, ApiError, del, get, patch, post } from '@/shared/api/httpClient';
import { csrfHeader } from '@/shared/api/csrf';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  CreateEquipmentDocumentPayload,
  CreateEquipmentPayload,
  EquipmentDocumentDto,
  EquipmentDto,
  UpdateEquipmentDocumentPayload,
  UpdateEquipmentPayload,
} from './types';

export const EQUIPMENT_DOCUMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function listEquipment(): Promise<EquipmentDto[]> {
  return get<EquipmentDto[]>('/equipment');
}

export function createEquipment(payload: CreateEquipmentPayload): Promise<EquipmentDto> {
  return post<EquipmentDto>('/equipment', stripEmpty(payload));
}

export function updateEquipment(
  equipmentId: string,
  payload: UpdateEquipmentPayload,
): Promise<EquipmentDto> {
  return patch<EquipmentDto>(`/equipment/${equipmentId}`, payload);
}

export function deleteEquipment(equipmentId: string): Promise<void> {
  return del<void>(`/equipment/${equipmentId}`);
}

export function listEquipmentDocuments(equipmentId: string): Promise<EquipmentDocumentDto[]> {
  return get<EquipmentDocumentDto[]>(`/equipment/${equipmentId}/documents`);
}

export async function createEquipmentDocument(
  equipmentId: string,
  payload: CreateEquipmentDocumentPayload,
  file: File,
): Promise<EquipmentDocumentDto> {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(stripEmpty(payload)));
  formData.append('file', file);

  const response = await fetch(`${API_URL}/equipment/${equipmentId}/documents`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', ...csrfHeader() },
    body: formData,
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message?: unknown }).message)
        : undefined;
    throw new ApiError(response.status, body, message);
  }

  return body as EquipmentDocumentDto;
}

export function updateEquipmentDocument(
  equipmentId: string,
  documentId: string,
  payload: UpdateEquipmentDocumentPayload,
): Promise<EquipmentDocumentDto> {
  return patch<EquipmentDocumentDto>(
    `/equipment/${equipmentId}/documents/${documentId}`,
    payload,
  );
}

export function deleteEquipmentDocument(equipmentId: string, documentId: string): Promise<void> {
  return del<void>(`/equipment/${equipmentId}/documents/${documentId}`);
}

export function equipmentDocumentFileUrl(equipmentId: string, documentId: string): string {
  return `${API_URL}/equipment/${equipmentId}/documents/${documentId}/file`;
}
