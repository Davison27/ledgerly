import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  buildQueryString,
  del,
  get,
  patch,
  post,
  setSigningOut,
  setUnauthorizedHandler,
} from './httpClient';

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('httpClient', () => {
  beforeEach(() => {
    setSigningOut(false);
    setUnauthorizedHandler(() => undefined);
    document.cookie = 'lg_csrf=; Max-Age=0; Path=/';
  });

  it('builds query strings while omitting empty values', () => {
    expect(buildQueryString({ page: 2, size: 20, search: '', status: null, sort: undefined })).toBe(
      '?page=2&size=20',
    );
  });

  it('sends credentials and the CSRF token for unsafe requests', async () => {
    document.cookie = 'lg_csrf=csrf%20token';
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 'project-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await post('/projects', { name: 'Project' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3005/api/projects',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ name: 'Project' }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf token',
        }),
      }),
    );
  });

  it('does not send a CSRF header for safe requests', async () => {
    document.cookie = 'lg_csrf=csrf-token';
    const fetchMock = vi.fn().mockResolvedValue(response([{ id: 'project-1' }]));
    vi.stubGlobal('fetch', fetchMock);

    await get('/projects');

    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('returns parsed response bodies for patch and delete', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ name: 'Updated' }))
      .mockResolvedValueOnce(response(undefined, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      patch<{ name: string }>('/projects/project-1', { name: 'Updated' }),
    ).resolves.toEqual({
      name: 'Updated',
    });
    await expect(del('/projects/project-1')).resolves.toBeUndefined();
  });

  it('raises ApiError with the server message and invokes the unauthorized handler', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(response({ message: ['Not allowed', 'Try again'] }, { status: 401 })),
    );

    const promise = get('/projects');

    await expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      body: { message: ['Not allowed', 'Try again'] },
      message: 'Not allowed, Try again',
    } satisfies Partial<ApiError>);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not invoke the unauthorized handler while signing out', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    setSigningOut(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('expired', { status: 401 })));

    await expect(get('/projects')).rejects.toBeInstanceOf(ApiError);

    expect(unauthorized).not.toHaveBeenCalled();
  });
});
