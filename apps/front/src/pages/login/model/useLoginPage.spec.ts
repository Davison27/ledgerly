import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  bootstrapFirstAdmin,
  isSessionLifecycleLocked,
  sessionQueries,
  signInWithGoogle,
} from '@/entities/session';
import { ApiError } from '@/shared/api/httpClient';
import { useLoginPage } from './useLoginPage';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/entities/session', () => ({
  bootstrapFirstAdmin: vi.fn(),
  isSessionLifecycleLocked: vi.fn(),
  sessionQueries: { status: vi.fn() },
  signInWithGoogle: vi.fn(),
}));

vi.mock('@/shared/api/httpClient', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`Request failed with status ${status}`);
      this.status = status;
    }
  },
}));

describe('useLoginPage', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(navigate as never);
    vi.mocked(useSearch).mockReturnValue({} as never);
    vi.mocked(sessionQueries.status).mockReturnValue({ queryKey: ['session', 'status'] } as never);
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false } as never);
    vi.mocked(isSessionLifecycleLocked).mockReturnValue(false);
    vi.mocked(bootstrapFirstAdmin).mockResolvedValue({} as never);
    vi.mocked(signInWithGoogle).mockResolvedValue(undefined);
  });

  it('maps session state and query flags to the login view model', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { bootstrapNeeded: true },
      isLoading: true,
    } as never);
    vi.mocked(useSearch).mockReturnValue({
      authError: 'access_denied',
      sessionExpired: true,
      signedOut: true,
    } as never);

    const { result, rerender } = renderHook(() => useLoginPage());

    expect(result.current.status).toBe('loading');
    expect(result.current.authError).toBe('accessDenied');
    expect(result.current.sessionNotice).toBe('expired');

    vi.mocked(useQuery).mockReturnValue({
      data: { bootstrapNeeded: true },
      isLoading: false,
    } as never);
    rerender();

    expect(result.current.status).toBe('bootstrap');
  });

  it('redirects authenticated users when the lifecycle is not locked', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { authenticated: true },
      isLoading: false,
    } as never);

    renderHook(() => useLoginPage());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' }));
  });

  it('bootstraps the first admin and starts Google sign-in', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { bootstrapNeeded: true },
      isLoading: false,
    } as never);
    const { result } = renderHook(() => useLoginPage());

    await act(async () => {
      await result.current.handleBootstrapSubmit('admin@acme.test');
    });

    expect(bootstrapFirstAdmin).toHaveBeenCalledWith('admin@acme.test');
    expect(signInWithGoogle).toHaveBeenCalledWith(`${window.location.origin}/dashboard`);
    expect(result.current.bootstrapError).toBeUndefined();
  });

  it('exposes a distinct bootstrap error for a rejected admin email', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { bootstrapNeeded: true },
      isLoading: false,
    } as never);
    vi.mocked(bootstrapFirstAdmin).mockRejectedValue(new ApiError(403, undefined));
    const { result } = renderHook(() => useLoginPage());

    await act(async () => {
      await result.current.handleBootstrapSubmit('blocked@acme.test');
    });

    expect(result.current.bootstrapError).toBe('notAllowed');
    expect(result.current.bootstrapSubmitting).toBe(false);
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it('clears sign-in submitting state when the OAuth request fails', async () => {
    vi.mocked(signInWithGoogle).mockRejectedValue(new Error('oauth unavailable'));
    const { result } = renderHook(() => useLoginPage());

    await act(async () => {
      await result.current.handleSignIn();
    });

    expect(signInWithGoogle).toHaveBeenCalledWith(`${window.location.origin}/dashboard`);
    expect(result.current.signInSubmitting).toBe(false);
  });
});
