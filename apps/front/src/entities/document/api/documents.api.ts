import { API_URL, ApiError, buildQueryString, del, get, patch } from '@/shared/api/httpClient';
import { csrfHeader, readCsrfToken, CSRF_HEADER_NAME } from '@/shared/api/csrf';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  CreateDocumentPayload,
  DocumentDto,
  DocumentFiltersDto,
  DocumentListFiltersDto,
  DocumentListItemDto,
  DuplicateCheckParams,
  DuplicateCheckResultDto,
  ExtractInvoiceResult,
  UpdateDocumentPayload,
} from './types';

export function listDocuments(
  projectId: string,
  filters: DocumentFiltersDto = {},
): Promise<DocumentDto[]> {
  const qs = buildQueryString({
    search: filters.search,
    type: filters.type,
    status: filters.status,
    direction: filters.direction,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
  });
  return get<DocumentDto[]>(`/projects/${projectId}/documents${qs}`);
}

export function listAllDocuments(
  filters: DocumentListFiltersDto = {},
): Promise<DocumentListItemDto[]> {
  const qs = buildQueryString({
    search: filters.search,
    type: filters.type,
    status: filters.status,
    direction: filters.direction,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    projectId: filters.projectId,
    supplierId: filters.supplierId,
    staffMemberId: filters.staffMemberId,
  });
  return get<DocumentListItemDto[]>(`/documents${qs}`);
}

export function checkDuplicate(
  params: DuplicateCheckParams,
): Promise<DuplicateCheckResultDto> {
  const qs = buildQueryString({
    issuerName: params.issuerName,
    issuerTaxId: params.issuerTaxId,
    invoiceNumber: params.invoiceNumber,
    amount: params.amount,
  });
  return get<DuplicateCheckResultDto>(`/documents/duplicate-check${qs}`);
}

export async function createDocument(
  projectId: string,
  payload: CreateDocumentPayload,
  file?: File,
): Promise<DocumentDto> {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(stripEmpty(payload)));
  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(`${API_URL}/projects/${projectId}/documents`, {
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

  return body as DocumentDto;
}

export function documentFileUrl(projectId: string, documentId: string): string {
  return `${API_URL}/projects/${projectId}/documents/${documentId}/file`;
}

export function getDocument(projectId: string, id: string): Promise<DocumentDto> {
  return get<DocumentDto>(`/projects/${projectId}/documents/${id}`);
}

export function updateDocument(
  projectId: string,
  id: string,
  payload: UpdateDocumentPayload,
): Promise<DocumentDto> {
  return patch<DocumentDto>(`/projects/${projectId}/documents/${id}`, payload);
}

export function deleteDocument(projectId: string, id: string): Promise<void> {
  return del<void>(`/projects/${projectId}/documents/${id}`);
}

function requestExtraction(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ExtractInvoiceResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', url);
    xhr.withCredentials = true;
    const csrfToken = readCsrfToken();
    if (csrfToken) {
      xhr.setRequestHeader(CSRF_HEADER_NAME, csrfToken);
    }
    xhr.responseType = 'text';

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        body = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as ExtractInvoiceResult);
        return;
      }

      const message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message?: unknown }).message)
          : undefined;
      reject(new ApiError(xhr.status, body, message));
    };

    xhr.onerror = () => {
      reject(new ApiError(0, undefined, 'Network error'));
    };

    xhr.send(formData);
  });
}

export function extractInvoice(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ExtractInvoiceResult> {
  return requestExtraction(`${API_URL}/projects/${projectId}/documents/extract`, file, onProgress);
}

export function extractInvoiceStandalone(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ExtractInvoiceResult> {
  return requestExtraction(`${API_URL}/documents/extract`, file, onProgress);
}
