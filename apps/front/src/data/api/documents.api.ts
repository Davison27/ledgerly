import { API_URL, ApiError, buildQueryString, get } from './httpClient';
import { stripEmpty } from './sanitize';
import type {
  CreateDocumentPayload,
  DocumentDto,
  DocumentFiltersDto,
  ExtractInvoiceResult,
} from './types';

export function listDocuments(
  projectId: string,
  filters: DocumentFiltersDto = {},
): Promise<DocumentDto[]> {
  const qs = buildQueryString({
    search: filters.search,
    type: filters.type,
    status: filters.status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
  });
  return get<DocumentDto[]>(`/projects/${projectId}/documents${qs}`);
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

  // Multipart upload: let the browser set the Content-Type header (with boundary),
  // so we bypass the shared JSON `post` helper and use `fetch` directly here.
  const response = await fetch(`${API_URL}/projects/${projectId}/documents`, {
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

  return body as DocumentDto;
}

export function documentFileUrl(projectId: string, documentId: string): string {
  return `${API_URL}/projects/${projectId}/documents/${documentId}/file`;
}

export function extractInvoice(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ExtractInvoiceResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/projects/${projectId}/documents/extract`);
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
