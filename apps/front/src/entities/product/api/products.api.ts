import { del, get, patch, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type { CreateProductPayload, ProductDto, UpdateProductPayload } from './types';

export function listProducts(): Promise<ProductDto[]> {
  return get<ProductDto[]>('/products');
}

export function createProduct(payload: CreateProductPayload): Promise<ProductDto> {
  return post<ProductDto>('/products', stripEmpty(payload));
}

export function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<ProductDto> {
  return patch<ProductDto>(`/products/${productId}`, payload);
}

export function deleteProduct(productId: string): Promise<void> {
  return del<void>(`/products/${productId}`);
}
