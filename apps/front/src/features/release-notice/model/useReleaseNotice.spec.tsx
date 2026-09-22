import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentReleaseVersion, releaseNoteQueries } from '@/entities/release-note';
import { useReleaseNotice } from './useReleaseNotice';

const apiMocks = vi.hoisted(() => ({
  getAcknowledgement: vi.fn(),
  acknowledge: vi.fn(),
}));

vi.mock('@/entities/release-note/api/release-notes.api', () => ({
  getReleaseNoteAcknowledgement: apiMocks.getAcknowledgement,
  acknowledgeReleaseNote: apiMocks.acknowledge,
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function renderReleaseNotice(onViewChangelog = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const hook = renderHook(() => useReleaseNotice({ onViewChangelog }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return { ...hook, queryClient, onViewChangelog };
}

describe('useReleaseNotice', () => {
  beforeEach(() => {
    apiMocks.getAcknowledgement.mockReset();
    apiMocks.acknowledge.mockReset();
  });

  it('keeps the acknowledgement undecided while the server query is pending', async () => {
    const response = deferred<{ acknowledged: boolean; acknowledgedAt: string | null }>();
    apiMocks.getAcknowledgement.mockReturnValue(response.promise);
    const { result } = renderReleaseNotice();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAcknowledged).toBe(false);

    await act(async () => {
      response.resolve({ acknowledged: false, acknowledgedAt: null });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAcknowledged).toBe(false);
    expect(apiMocks.getAcknowledgement).toHaveBeenCalledWith(currentReleaseVersion);
  });

  it('uses the exact version-scoped acknowledgement key', () => {
    expect(releaseNoteQueries.acknowledgement('1.2.0').queryKey).toEqual([
      'release-notes',
      'acknowledgement',
      '1.2.0',
    ]);
  });

  it('waits for a successful acknowledgement before navigating and refreshes the same query', async () => {
    const write = deferred<void>();
    let acknowledged = false;
    apiMocks.getAcknowledgement.mockImplementation(async () => ({
      acknowledged,
      acknowledgedAt: acknowledged ? '2026-09-22T10:00:00.000Z' : null,
    }));
    apiMocks.acknowledge.mockImplementation(() => write.promise);
    const { result, queryClient, onViewChangelog } = renderReleaseNotice();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let operation: Promise<void> | undefined;

    act(() => {
      operation = result.current.performAction('view-changelog');
    });
    await waitFor(() => expect(apiMocks.acknowledge).toHaveBeenCalledWith(currentReleaseVersion));
    expect(onViewChangelog).not.toHaveBeenCalled();

    await act(async () => {
      acknowledged = true;
      write.resolve();
      await operation;
    });

    expect(onViewChangelog).toHaveBeenCalledOnce();
    expect(apiMocks.getAcknowledgement).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(releaseNoteQueries.acknowledgement(currentReleaseVersion).queryKey),
    ).toEqual({ acknowledged: true, acknowledgedAt: '2026-09-22T10:00:00.000Z' });
    expect(result.current.isAcknowledged).toBe(true);
  });

  it('keeps a failed acknowledgement open and retries the same explicit action', async () => {
    let acknowledged = false;
    apiMocks.getAcknowledgement.mockImplementation(async () => ({
      acknowledged,
      acknowledgedAt: acknowledged ? '2026-09-22T10:00:00.000Z' : null,
    }));
    apiMocks.acknowledge
      .mockRejectedValueOnce(new Error('network error'))
      .mockImplementationOnce(async () => {
        acknowledged = true;
      });
    const { result, onViewChangelog } = renderReleaseNotice();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.performAction('view-changelog');
    });

    expect(result.current.isAcknowledged).toBe(false);
    expect(result.current.mutationError).toBeInstanceOf(Error);
    expect(onViewChangelog).not.toHaveBeenCalled();

    act(() => {
      result.current.retryAcknowledgement();
    });

    await waitFor(() => expect(result.current.isAcknowledged).toBe(true));
    expect(apiMocks.acknowledge).toHaveBeenCalledTimes(2);
    expect(onViewChangelog).toHaveBeenCalledOnce();
  });
});
