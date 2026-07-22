import { API_URL, ApiError, buildQueryString, del, get, patch, post } from './httpClient';
import { stripEmpty } from './sanitize';
import type {
  CreateStaffDocumentPayload,
  CreateStaffMemberPayload,
  StaffDocumentDto,
  StaffDocumentTypeDto,
  StaffMemberDto,
  UpdateStaffDocumentPayload,
  UpdateStaffMemberPayload,
} from './types';

export function listStaffMembers(): Promise<StaffMemberDto[]> {
  return get<StaffMemberDto[]>('/staff');
}

export function getStaffMember(staffMemberId: string): Promise<StaffMemberDto> {
  return get<StaffMemberDto>(`/staff/${staffMemberId}`);
}

export function createStaffMember(payload: CreateStaffMemberPayload): Promise<StaffMemberDto> {
  return post<StaffMemberDto>('/staff', stripEmpty(payload));
}

export function updateStaffMember(
  staffMemberId: string,
  payload: UpdateStaffMemberPayload,
): Promise<StaffMemberDto> {
  // Unlike `createStaffMember`, this must NOT go through `stripEmpty()`: an
  // explicit `endDate: null` is how the form reinstates someone who was given
  // an end date by mistake (D5 of the staff-section plan), and `stripEmpty`
  // would silently drop that null instead of clearing the field.
  return patch<StaffMemberDto>(`/staff/${staffMemberId}`, payload);
}

export function deleteStaffMember(staffMemberId: string): Promise<void> {
  return del<void>(`/staff/${staffMemberId}`);
}

export function listStaffDocumentTypes(): Promise<StaffDocumentTypeDto[]> {
  return get<StaffDocumentTypeDto[]>('/staff-document-types');
}

export function listStaffDocuments(
  staffMemberId: string,
  typeId?: string,
): Promise<StaffDocumentDto[]> {
  const qs = buildQueryString({ typeId });
  return get<StaffDocumentDto[]>(`/staff/${staffMemberId}/documents${qs}`);
}

export async function createStaffDocument(
  staffMemberId: string,
  payload: CreateStaffDocumentPayload,
  file: File,
): Promise<StaffDocumentDto> {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(stripEmpty(payload)));
  formData.append('file', file);

  // Multipart upload: let the browser set the Content-Type header (with
  // boundary), same reasoning as `createDocument` in documents.api.ts.
  const response = await fetch(`${API_URL}/staff/${staffMemberId}/documents`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
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

  return body as StaffDocumentDto;
}

export function updateStaffDocument(
  staffMemberId: string,
  documentId: string,
  payload: UpdateStaffDocumentPayload,
): Promise<StaffDocumentDto> {
  return patch<StaffDocumentDto>(`/staff/${staffMemberId}/documents/${documentId}`, payload);
}

export function deleteStaffDocument(staffMemberId: string, documentId: string): Promise<void> {
  return del<void>(`/staff/${staffMemberId}/documents/${documentId}`);
}

export function staffDocumentFileUrl(staffMemberId: string, documentId: string): string {
  return `${API_URL}/staff/${staffMemberId}/documents/${documentId}/file`;
}
