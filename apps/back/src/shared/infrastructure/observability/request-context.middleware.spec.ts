import type { Request, Response } from 'express';
import { createRequestContextMiddleware } from './request-context.middleware';

describe('createRequestContextMiddleware', () => {
  it('returns the request identifier and logs only request metadata when the response finishes', () => {
    const log = jest.fn();
    const handlers: Record<string, () => void> = {};
    const request = { method: 'POST', path: '/api/documents', requestId: undefined } as unknown as Request & {
      requestId?: string;
    };
    const setHeader = jest.fn();
    const response = {
      statusCode: 201,
      setHeader,
      once: jest.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
    } as unknown as Response;

    createRequestContextMiddleware({ createId: () => 'req-1', now: () => 125, log })(request, response, jest.fn());
    handlers.finish();

    expect(request.requestId).toBe('req-1');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-1');
    expect(log).toHaveBeenCalledWith({
      requestId: 'req-1',
      method: 'POST',
      path: '/api/documents',
      statusCode: 201,
      durationMs: 0,
    });
  });
});
