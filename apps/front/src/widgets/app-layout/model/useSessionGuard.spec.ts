import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/httpClient';
import { useSessionGuard } from './useSessionGuard';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  fetchQuery: vi.fn(),
  clear: vi.fn(),
  status: vi.fn(),
  current: vi.fn(),
  lockSessionLifecycle: vi.fn(),
  logout: vi.fn(),
  writeSessionLifecycleState: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('@/entities/session', () => ({
  createActiveSessionLifecycleState: (now: number) => ({ lastActivityAt: now, locked: false }),
  isLockedSessionLifecycleValue: vi.fn(() => false),
  isSessionIdle: vi.fn(() => false),
  isSessionLifecycleLocked: vi.fn(() => false),
  lockSessionLifecycle: mocks.lockSessionLifecycle,
  logout: mocks.logout,
  readSessionLifecycleState: vi.fn(() => ({ lastActivityAt: null, locked: false })),
  sessionQueries: { status: mocks.status },
  shouldPersistSessionActivity: vi.fn(() => false),
  writeSessionLifecycleState: mocks.writeSessionLifecycleState,
  SESSION_INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000,
  SESSION_LIFECYCLE_LOCK_EVENT: 'ledgerly.session.lifecycle.lock',
  SESSION_LIFECYCLE_STORAGE_KEY: 'ledgerly.session.lifecycle',
}));

vi.mock('@/entities/workspace-member', () => ({
  workspaceMemberQueries: { current: mocks.current },
}));

describe('useSessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mocks.navigate as never);
    vi.mocked(useQueryClient).mockReturnValue({
      clear: mocks.clear,
      fetchQuery: mocks.fetchQuery,
    } as never);
    mocks.status.mockReturnValue({ queryKey: ['session', 'status'] });
    mocks.current.mockReturnValue({ queryKey: ['workspace', 'member'] });
    mocks.fetchQuery
      .mockResolvedValueOnce({ authenticated: true })
      .mockResolvedValueOnce({ id: 'member-1' });
    mocks.logout.mockResolvedValue(undefined);
    mocks.writeSessionLifecycleState.mockReturnValue(true);
  });

  it('becomes ready only after session and workspace membership validation', async () => {
    const { result } = renderHook(() => useSessionGuard());

    await waitFor(() => expect(result.current).toBe(true));

    expect(mocks.fetchQuery).toHaveBeenCalledTimes(2);
    expect(mocks.writeSessionLifecycleState).toHaveBeenCalledWith(
      expect.objectContaining({ locked: false }),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('redirects without logout when the session is unauthorized', async () => {
    mocks.fetchQuery.mockReset();
    mocks.fetchQuery
      .mockRejectedValueOnce(new ApiError(401, undefined))
      .mockResolvedValueOnce({ id: 'member-1' });

    renderHook(() => useSessionGuard());

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/',
        search: { sessionExpired: true },
      }),
    );
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.clear).toHaveBeenCalled();
  });

  it('redirects to access denied when the workspace membership is forbidden', async () => {
    mocks.fetchQuery.mockReset();
    mocks.fetchQuery
      .mockResolvedValueOnce({ authenticated: true })
      .mockRejectedValueOnce(new ApiError(403, undefined));

    renderHook(() => useSessionGuard());

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/',
        search: { authError: 'access_denied' },
      }),
    );
    expect(mocks.fetchQuery).toHaveBeenNthCalledWith(1, { queryKey: ['session', 'status'] });
    expect(mocks.fetchQuery).toHaveBeenNthCalledWith(2, {
      queryKey: ['workspace', 'member'],
      staleTime: 0,
    });
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
