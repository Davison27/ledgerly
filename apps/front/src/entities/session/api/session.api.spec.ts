import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionLifecycleState,
  isSessionLifecycleLocked,
  lockSessionLifecycle,
} from '../model/sessionLifecycle';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  setSigningOut: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/shared/api/auth-client', () => ({
  authClient: {
    signIn: { social: mocks.signInSocial },
    signOut: mocks.signOut,
  },
}));

vi.mock('@/shared/api/httpClient', () => ({
  get: mocks.get,
  post: mocks.post,
  setSigningOut: mocks.setSigningOut,
}));

describe('session API', () => {
  let sessionApi: typeof import('./session.api');

  beforeAll(async () => {
    sessionApi = await import('./session.api');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionLifecycleState();
    mocks.get.mockResolvedValue({});
    mocks.post.mockResolvedValue({});
    mocks.signInSocial.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('delegates auth status and first-admin bootstrap to the backend', async () => {
    await sessionApi.getAuthStatus();
    await sessionApi.bootstrapFirstAdmin('admin@acme.test');

    expect(mocks.get).toHaveBeenCalledWith('/auth/status');
    expect(mocks.post).toHaveBeenCalledWith('/auth/bootstrap', { email: 'admin@acme.test' });
  });

  it('clears lifecycle state before OAuth sign-in and preserves its callback URL', async () => {
    lockSessionLifecycle(123);

    await sessionApi.signInWithGoogle('https://app.ledgerly.test/dashboard');

    expect(mocks.signInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: 'https://app.ledgerly.test/dashboard',
    });
    expect(isSessionLifecycleLocked()).toBe(false);
  });

  it('restores a locked lifecycle when OAuth sign-in fails', async () => {
    lockSessionLifecycle(123);
    mocks.signInSocial.mockRejectedValue(new Error('OAuth unavailable'));

    await expect(
      sessionApi.signInWithGoogle('https://app.ledgerly.test/dashboard'),
    ).rejects.toThrow('OAuth unavailable');

    expect(isSessionLifecycleLocked()).toBe(true);
  });

  it('always clears the signing-out guard after logout success or failure', async () => {
    await sessionApi.logout();
    expect(mocks.setSigningOut).toHaveBeenNthCalledWith(1, true);
    expect(mocks.setSigningOut).toHaveBeenNthCalledWith(2, false);

    vi.clearAllMocks();
    mocks.signOut.mockRejectedValue(new Error('logout failed'));
    await expect(sessionApi.logout()).rejects.toThrow('logout failed');
    expect(mocks.setSigningOut).toHaveBeenNthCalledWith(1, true);
    expect(mocks.setSigningOut).toHaveBeenNthCalledWith(2, false);
  });
});
