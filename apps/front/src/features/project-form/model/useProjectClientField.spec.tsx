import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientQueries, createClient } from '@/entities/client';
import { projectQueries } from '@/entities/project';
import { useProjectClientField } from './useProjectClientField';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQuery: vi.fn(), useQueryClient: vi.fn() };
});
vi.mock('@/entities/client', () => ({
  clientQueries: { all: ['clients'], list: vi.fn(() => ({ queryKey: ['clients', 'list'] })) },
  createClient: vi.fn(),
}));
vi.mock('@/entities/project', () => ({ projectQueries: { all: ['projects'] } }));

describe('useProjectClientField', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: [
        { id: 'active', name: 'Active client', archivedAt: null },
        { id: 'archived', name: 'Archived client', archivedAt: '2026-01-01T00:00:00.000Z' },
      ],
      isPending: false,
    } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never);
  });

  it('exposes active clients only to project parent selectors', () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useProjectClientField(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    expect(result.current.clients).toEqual([{ id: 'active', name: 'Active client', archivedAt: null }]);
  });

  it('refreshes the active selector and project views after inline creation', async () => {
    vi.mocked(createClient).mockResolvedValue({ id: 'new-client', name: 'New client' });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useProjectClientField(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    act(() => {
      result.current.openCreate();
      result.current.setCreateValues({ name: 'New client', taxId: '' });
    });
    await act(async () => {
      await result.current.create();
    });

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledWith({ name: 'New client', taxId: undefined });
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: clientQueries.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: projectQueries.all });
    expect(result.current.createOpen).toBe(false);
  });
});
