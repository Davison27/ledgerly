import { useSearch } from '@tanstack/react-router';

export function useInitialSupplierFilter(): string | undefined {
  const search = useSearch({ strict: false }) as { supplierId?: unknown };

  return typeof search.supplierId === 'string' ? search.supplierId : undefined;
}
