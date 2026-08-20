import { API_URL, ApiError, buildQueryString, del, get, patch } from '@/shared/api/httpClient';
import { csrfHeader } from '@/shared/api/csrf';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  CompanyBrandingDto,
  CompanyDocumentDto,
  CompanyDocumentTypeDto,
  CompanyDto,
  CreateCompanyDocumentPayload,
  UpdateCompanyDocumentPayload,
  UpdateCompanyPayload,
} from './types';

export function getCompany(): Promise<CompanyDto> {
  return get<CompanyDto>('/company');
}

export function fetchCompanyBranding(): Promise<CompanyBrandingDto> {
  return get<CompanyBrandingDto>('/company/branding');
}

export function updateCompany(payload: UpdateCompanyPayload): Promise<CompanyDto> {
  return patch<CompanyDto>('/company', stripEmpty(payload));
}

export function listCompanyDocumentTypes(): Promise<CompanyDocumentTypeDto[]> {
  return get<CompanyDocumentTypeDto[]>('/company/document-types');
}

export function listCompanyDocuments(typeId?: string): Promise<CompanyDocumentDto[]> {
  const qs = buildQueryString({ typeId });
  return get<CompanyDocumentDto[]>(`/company/documents${qs}`);
}

export async function createCompanyDocument(
  payload: CreateCompanyDocumentPayload,
  file: File,
): Promise<CompanyDocumentDto> {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(stripEmpty(payload)));
  formData.append('file', file);

  const response = await fetch(`${API_URL}/company/documents`, {
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

  return body as CompanyDocumentDto;
}

export function updateCompanyDocument(
  documentId: string,
  payload: UpdateCompanyDocumentPayload,
): Promise<CompanyDocumentDto> {
  return patch<CompanyDocumentDto>(`/company/documents/${documentId}`, payload);
}

export function deleteCompanyDocument(documentId: string): Promise<void> {
  return del<void>(`/company/documents/${documentId}`);
}

export function companyDocumentFileUrl(documentId: string): string {
  return `${API_URL}/company/documents/${documentId}/file`;
}
