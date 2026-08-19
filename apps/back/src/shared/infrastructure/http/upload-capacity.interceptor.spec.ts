import { ConfigService } from '@nestjs/config';
import { CapacityExceededException } from '../../domain/errors/capacity-exceeded.exception';
import { UploadCapacityGate } from './upload-capacity.interceptor';

function config(values: Record<string, number>): ConfigService {
  return { get: (key: string, fallback: number) => values[key] ?? fallback } as unknown as ConfigService;
}

describe('UploadCapacityGate', () => {
  it('rejects uploads when the active and queued limits are full', async () => {
    const gate = new UploadCapacityGate(
      config({ PDF_UPLOAD_MAX_ACTIVE: 1, PDF_UPLOAD_MAX_QUEUED: 0, PDF_RETRY_AFTER_SECONDS: 19 }),
    );
    const release = await gate.acquire();

    await expect(gate.acquire()).rejects.toMatchObject({
      code: 'PDF_CAPACITY_EXCEEDED',
      retryAfterSeconds: 19,
    });

    release();
  });

  it('serves queued uploads in FIFO order', async () => {
    const gate = new UploadCapacityGate(
      config({ PDF_UPLOAD_MAX_ACTIVE: 1, PDF_UPLOAD_MAX_QUEUED: 1, PDF_UPLOAD_QUEUE_TIMEOUT_MS: 1000 }),
    );
    const release = await gate.acquire();
    let queued = false;
    const nextRelease = gate.acquire().then((value) => {
      queued = true;
      return value;
    });

    await Promise.resolve();
    expect(queued).toBe(false);
    release();
    const releaseQueued = await nextRelease;
    expect(queued).toBe(true);
    releaseQueued();
  });

  it('rejects a queued upload after its wait timeout', async () => {
    jest.useFakeTimers();
    try {
      const gate = new UploadCapacityGate(
        config({ PDF_UPLOAD_MAX_ACTIVE: 1, PDF_UPLOAD_MAX_QUEUED: 1, PDF_UPLOAD_QUEUE_TIMEOUT_MS: 25 }),
      );
      const release = await gate.acquire();
      const pending = gate.acquire();
      jest.advanceTimersByTime(25);

      await expect(pending).rejects.toBeInstanceOf(CapacityExceededException);
      release();
    } finally {
      jest.useRealTimers();
    }
  });
});
