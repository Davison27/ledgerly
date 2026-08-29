import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

interface RequestContextOptions {
  createId?: () => string;
  log?: (context: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
  }) => void;
  now?: () => number;
}

export function createRequestContextMiddleware(options: RequestContextOptions = {}) {
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? Date.now;
  const log = options.log ?? (() => undefined);

  return (request: RequestWithId, response: Response, next: NextFunction): void => {
    const requestId = createId();
    const startedAt = now();
    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.once('finish', () => {
      log({
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: now() - startedAt,
      });
    });
    next();
  };
}
