import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NotificationEventSubscriber } from '../events/notification-event-subscriber';
import { TypeOrmNotificationEventRetryRepository } from '../persistence/typeorm-notification-event-retry.repository';

const RETRY_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationEventRetryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEventRetryScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly repository: TypeOrmNotificationEventRetryRepository,
    private readonly subscriber: NotificationEventSubscriber,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.run(), RETRY_INTERVAL_MS);
    void this.run();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = this.clock.now();
      for (const job of await this.repository.findDue(now)) {
        try {
          await this.subscriber.replay(job.eventName, job.payload);
          await this.repository.remove(job.id);
        } catch (error) {
          await this.repository.markFailed(job, error, now);
        }
      }
    } catch (error) {
      this.logger.error('Could not process pending notification events', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
