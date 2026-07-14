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
