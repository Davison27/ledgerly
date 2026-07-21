import { API_URL, ApiError, buildQueryString, del, get, patch } from './httpClient';
import { stripEmpty } from './sanitize';
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

// Not consumed by anything in this batch of work — deliberately. It's what
// the follow-up "open a document from /documents" work will use to re-fetch
// the full document (the global list item doesn't carry every field). Left
// unwired on purpose; do not remove it for being unused.
export function getDocument(projectId: string, id: string): Promise<DocumentDto> {
  return get<DocumentDto>(`/projects/${projectId}/documents/${id}`);
}

export function updateDocument(
  projectId: string,
  id: string,
  payload: UpdateDocumentPayload,
): Promise<DocumentDto> {
  // Unlike `createDocument`, this payload must NOT go through `stripEmpty()`.
  // An explicit `null` here means "clear this optional field" (D2 of the
  // document-crud plan); `stripEmpty` would drop those nulls and make it
  // impossible to clear a `dueDate` or an `invoiceNumber` from the edit form.
  return patch<DocumentDto>(`/projects/${projectId}/documents/${id}`, payload);
}

export function deleteDocument(projectId: string, id: string): Promise<void> {
  return del<void>(`/projects/${projectId}/documents/${id}`);
}

// Shared by `extractInvoice` and `extractInvoiceStandalone`: same XHR-based
// upload-with-progress plumbing, only the URL differs.
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

/**
 * Same extraction, without a project: used when uploading a payroll from the
 * staff member's own page, where there's no project chosen yet (R4/D2 of the
 * staff-section plan). Hits the global alias `POST /documents/extract`.
 */
export function extractInvoiceStandalone(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ExtractInvoiceResult> {
  return requestExtraction(`${API_URL}/documents/extract`, file, onProgress);
}
