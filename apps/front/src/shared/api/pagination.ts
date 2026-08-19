export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
