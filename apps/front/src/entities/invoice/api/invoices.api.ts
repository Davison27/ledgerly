import { API_URL, del, get, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type { CreateInvoicePayload, InvoiceDto } from './types';

export function listInvoices(): Promise<InvoiceDto[]> {
  return get<InvoiceDto[]>('/invoices');
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
