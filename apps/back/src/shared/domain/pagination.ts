export interface PageRequest {
  page: number;
  size: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function pageOffset(request: PageRequest): number {
  return (request.page - 1) * request.size;
}
