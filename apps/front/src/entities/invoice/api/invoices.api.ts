import { API_URL, del, get, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type { CreateInvoicePayload, InvoiceDto, InvoiceListItemDto } from './types';
import type { PageDto } from '@/shared/api/pagination';

export function listInvoices(): Promise<InvoiceListItemDto[]> {
  return get<InvoiceListItemDto[]>('/invoices');
}

export function listInvoicesPage(
  page = 1,
  size = 20,
  search?: string,
): Promise<PageDto<InvoiceListItemDto>> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (search?.trim()) qs.set('search', search.trim());
  return get<PageDto<InvoiceListItemDto>>(`/invoices?${qs.toString()}`);
}

export function getInvoice(id: string): Promise<InvoiceDto> {
  return get<InvoiceDto>(`/invoices/${id}`);
}

export function createInvoice(payload: CreateInvoicePayload): Promise<InvoiceDto> {
  return post<InvoiceDto>('/invoices', stripEmpty(payload));
}

export function deleteInvoice(id: string): Promise<void> {
  return del<void>(`/invoices/${id}`);
}

export function invoicePdfUrl(id: string): string {
  return `${API_URL}/invoices/${id}/pdf`;
}
