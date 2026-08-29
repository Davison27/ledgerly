import type { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

interface JsonLoggerOptions {
  now?: () => string;
  write?: (event: string) => void;
}

export interface HttpRequestLogContext {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

export class JsonLogger implements LoggerService {
  private readonly now: () => string;
  private readonly write: (event: string) => void;

  constructor(options: JsonLoggerOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.write = options.write ?? ((event) => process.stdout.write(`${event}\n`));
  }

  log(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('log');
  }

  error(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('error');
  }

  warn(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('warn');
  }

  debug(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('debug');
  }

  verbose(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('verbose');
  }

  fatal(_message: unknown, _context?: unknown): void {
    void _message;
    void _context;
    this.emit('fatal');
  }

  logHttpRequest(context: HttpRequestLogContext): void {
    this.write(
      JSON.stringify({
        timestamp: this.now(),
        level: 'log',
        event: 'http_request',
        requestId: context.requestId,
        method: context.method,
        path: context.path,
        statusCode: context.statusCode,
        durationMs: context.durationMs,
      }),
    );
  }

  private emit(level: LogLevel): void {
    this.write(JSON.stringify({ timestamp: this.now(), level, event: 'application_log' }));
  }
}
