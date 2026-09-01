import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfReadResult, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { PdfCapacityExceededException } from '../../domain/errors/pdf-capacity-exceeded.exception';
import { PdfjsPdfReader } from './pdfjs-pdf-reader';

type ReaderWaiter = {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
};

@Injectable()
export class BoundedPdfReader implements PdfReader {
  private active = 0;
  private readonly waiters: ReaderWaiter[] = [];

  constructor(
    private readonly reader: PdfjsPdfReader,
    private readonly config: ConfigService,
  ) {}

  async read(buffer: Buffer): Promise<PdfReadResult> {
    const release = await this.acquire();
    try {
      return await this.reader.read(buffer);
    } finally {
      release();
    }
  }

  private async acquire(): Promise<() => void> {
    const maxActive = this.config.get<number>('PDF_READER_MAX_ACTIVE', 2);
    const maxQueued = this.config.get<number>('PDF_READER_MAX_QUEUED', 8);
    const timeoutMs = this.config.get<number>('PDF_READER_QUEUE_TIMEOUT_MS', 30000);
    if (this.active < maxActive) {
      this.active += 1;
      return this.createRelease();
    }
    if (this.waiters.length >= maxQueued) {
      throw new PdfCapacityExceededException(this.config.get<number>('PDF_RETRY_AFTER_SECONDS', 15));
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter: ReaderWaiter = {
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
        waiter.reject(new PdfCapacityExceededException(this.config.get<number>('PDF_RETRY_AFTER_SECONDS', 15)));
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
