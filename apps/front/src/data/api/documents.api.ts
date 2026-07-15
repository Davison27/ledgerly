import { API_URL, ApiError, buildQueryString, get, post } from './httpClient';
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

export function createDocument(
  projectId: string,
  payload: CreateDocumentPayload,
): Promise<DocumentDto> {
  return post<DocumentDto>(`/projects/${projectId}/documents`, payload);
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
