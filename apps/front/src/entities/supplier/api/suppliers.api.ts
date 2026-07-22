import { del, get, patch, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type { CreateSupplierPayload, SupplierDto, UpdateSupplierPayload } from './types';

export function listSuppliers(): Promise<SupplierDto[]> {
  return get<SupplierDto[]>('/suppliers');
}

export function getSupplier(supplierId: string): Promise<SupplierDto> {
  return get<SupplierDto>(`/suppliers/${supplierId}`);
}

export function createSupplier(payload: CreateSupplierPayload): Promise<SupplierDto> {
  return post<SupplierDto>('/suppliers', stripEmpty(payload));
}

export function updateSupplier(
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<SupplierDto> {
  return patch<SupplierDto>(`/suppliers/${supplierId}`, stripEmpty(payload));
}

export function deleteSupplier(supplierId: string): Promise<void> {
  return del<void>(`/suppliers/${supplierId}`);
}
