import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearch } from '@tanstack/react-router';
import { useInitialSupplierFilter } from './useInitialSupplierFilter';

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(),
}));

describe('useInitialSupplierFilter', () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({} as never);
  });

  it('returns a valid supplier id from the route search', () => {
    vi.mocked(useSearch).mockReturnValue({ supplierId: 'supplier-1' } as never);

    expect(useInitialSupplierFilter()).toBe('supplier-1');
  });

  it('ignores non-string route values', () => {
    vi.mocked(useSearch).mockReturnValue({ supplierId: 42 } as never);

    expect(useInitialSupplierFilter()).toBeUndefined();
  });
});
