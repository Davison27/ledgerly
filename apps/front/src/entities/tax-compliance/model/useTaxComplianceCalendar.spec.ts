import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useTaxComplianceCalendar } from './useTaxComplianceCalendar';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../api/tax-compliance.queries', () => ({
  taxComplianceQueries: {
    settings: () => ({ queryKey: ['tax-compliance', 'settings'] }),
    calendar: (from: string, to: string) => ({
      queryKey: ['tax-compliance', 'calendar', from, to],
    }),
  },
}));

describe('useTaxComplianceCalendar', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never);
  });

  it('does not request settings or deadlines without calendar and project visibility', () => {
    const { result } = renderHook(() =>
      useTaxComplianceCalendar('2026-01-01', '2026-01-31', false),
    );

    expect(vi.mocked(useQuery).mock.calls.map(([options]) => options)).toEqual([
      expect.objectContaining({
        queryKey: ['tax-compliance', 'settings'],
        enabled: false,
      }),
      expect.objectContaining({
        queryKey: ['tax-compliance', 'calendar', '2026-01-01', '2026-01-31'],
        enabled: false,
      }),
    ]);
    expect(result.current).toMatchObject({
      enabled: false,
      settingsLoading: false,
      loading: false,
      loadError: false,
      deadlines: [],
    });
  });
});
