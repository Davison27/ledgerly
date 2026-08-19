import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, finalize } from 'rxjs';
import { CapacityExceededException } from '../../domain/errors/capacity-exceeded.exception';

type Waiter = {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
};

@Injectable()
export class UploadCapacityGate {
  private active = 0;
  private readonly waiters: Waiter[] = [];

  constructor(private readonly config: ConfigService) {}

  async acquire(): Promise<() => void> {
    const maxActive = this.config.get<number>('PDF_UPLOAD_MAX_ACTIVE', 4);
    const maxQueued = this.config.get<number>('PDF_UPLOAD_MAX_QUEUED', 16);
    const timeoutMs = this.config.get<number>('PDF_UPLOAD_QUEUE_TIMEOUT_MS', 15000);

    if (this.active < maxActive) {
      this.active += 1;
      return this.createRelease();
    }

    if (this.waiters.length >= maxQueued) {
      throw new CapacityExceededException(this.config.get<number>('PDF_RETRY_AFTER_SECONDS', 15));
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve: (release) => {
          clearTimeout(timeout);
          resolve(release);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      };
      const timeout = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        waiter.reject(new CapacityExceededException(this.config.get<number>('PDF_RETRY_AFTER_SECONDS', 15)));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  private createRelease(): () => void {
    let released = false;

    return () => {
      if (released) return;
      released = true;
      const next = this.waiters.shift();
      if (next) {
        next.resolve(this.createRelease());
        return;
      }
      this.active -= 1;
    };
  }
}

@Injectable()
export class UploadCapacityInterceptor implements NestInterceptor {
  private readonly gate: UploadCapacityGate;

  constructor(@Optional() gate?: UploadCapacityGate) {
    this.gate = gate ?? new UploadCapacityGate(new ConfigService());
  }

  async intercept(_context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const release = await this.gate.acquire();
    try {
      return next.handle().pipe(finalize(release));
    } catch (error) {
      release();
      throw error;
    }
  }
}
