import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { NotificationEventRetryOrmEntity } from './notification-event-retry.orm-entity';

@Injectable()
export class TypeOrmNotificationEventRetryRepository {
  constructor(
    @InjectRepository(NotificationEventRetryOrmEntity)
    private readonly repository: Repository<NotificationEventRetryOrmEntity>,
  ) {}

  async enqueue(eventName: string, payload: Record<string, unknown>, dedupeKey: string, now: Date): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(NotificationEventRetryOrmEntity)
      .values({ eventName, payload: payload as object, dedupeKey, attempts: 0, nextAttemptAt: now, lastError: null })
      .orIgnore()
      .execute();
  }

  findDue(now: Date): Promise<NotificationEventRetryOrmEntity[]> {
    return this.repository.find({ where: { nextAttemptAt: LessThanOrEqual(now) }, take: 50 });
  }

  async markFailed(job: NotificationEventRetryOrmEntity, error: unknown, now: Date): Promise<void> {
    const attempts = job.attempts + 1;
    const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
    await this.repository.update(job.id, {
      attempts,
      nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000),
      lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    });
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
