import type { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

interface JsonLoggerOptions {
  now?: () => string;
  write?: (event: string) => void;
}

const SENSITIVE_KEY = /authorization|cookie|token|secret|password|document|file|content/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(nestedValue)]),
  );
}

export class JsonLogger implements LoggerService {
  private readonly now: () => string;
  private readonly write: (event: string) => void;

  constructor(options: JsonLoggerOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.write = options.write ?? ((event) => process.stdout.write(`${event}\n`));
  }

  log(message: unknown, context?: unknown): void {
    this.emit('log', message, context);
  }

  error(message: unknown, context?: unknown): void {
    this.emit('error', message, context);
  }

  warn(message: unknown, context?: unknown): void {
    this.emit('warn', message, context);
  }

  debug(message: unknown, context?: unknown): void {
    this.emit('debug', message, context);
  }

  verbose(message: unknown, context?: unknown): void {
    this.emit('verbose', message, context);
  }

  fatal(message: unknown, context?: unknown): void {
    this.emit('fatal', message, context);
  }

  private emit(level: LogLevel, message: unknown, context: unknown): void {
    this.write(
      JSON.stringify({
        timestamp: this.now(),
        level,
        message: typeof message === 'string' ? message : redact(message),
        ...(context === undefined ? {} : { context: redact(context) }),
      }),
    );
  }
}
