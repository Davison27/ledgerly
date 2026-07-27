import { NotifyScheduleConflictsUseCase } from './notify-schedule-conflicts.use-case';
import { NotificationRepository } from '../../domain/notification.repository';
import { NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  NotificationScheduleConflictRow,
  NotificationScheduleEventRow,
  NotificationScheduleReader,
} from '../../domain/notification-schedule-reader.port';
import { Notification } from '../../domain/notification';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Notification[] = [];

  insertIfAbsent(notifications: Notification[]): Promise<Notification[]> {
    const existingKeys = new Set(this.notifications.map((notification) => notification.getDedupeKey()));
    const inserted = notifications.filter((notification) => !existingKeys.has(notification.getDedupeKey()));

    this.notifications.push(...inserted);

    return Promise.resolve(inserted);
  }

  findById(id: string): Promise<Notification | null> {
    return Promise.resolve(this.notifications.find((notification) => notification.getId() === id) ?? null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  findPage(): Promise<Page<NotificationListRow>> {
    return Promise.resolve({ items: [], total: 0, page: 1, size: 20 });
  }

  countUnread(): Promise<number> {
    return Promise.resolve(0);
  }

  markAllRead(): Promise<void> {
    return Promise.resolve();
  }

  deleteReadBefore(): Promise<number> {
    return Promise.resolve(0);
  }

  get all(): Notification[] {
    return this.notifications;
  }
}

class FakeNotificationScheduleReader implements NotificationScheduleReader {
  public receivedWindow: { from: string; to: string } | undefined;

  constructor(private readonly conflicts: NotificationScheduleConflictRow[] = []) {}

  findUpcomingEvents(): Promise<NotificationScheduleEventRow[]> {
    return Promise.resolve([]);
  }

  findBlockingConflicts(from: string, to: string): Promise<NotificationScheduleConflictRow[]> {
    this.receivedWindow = { from, to };
    return Promise.resolve(this.conflicts);
  }
}

class FakeNotificationDelivery implements NotificationDelivery {
  public delivered: Notification[] = [];

  deliver(notifications: Notification[]): Promise<void> {
    this.delivered.push(...notifications);
    return Promise.resolve();
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `notification-${this.nextId++}`;
  }
}

function buildConflictRow(overrides: Partial<NotificationScheduleConflictRow> = {}): NotificationScheduleConflictRow {
  return {
    eventId: 'event-1',
    projectId: 'project-1',
    projectName: 'Project One',
    title: 'Montaje',
    date: '2026-07-20',
    kind: 'staff_overlap',
    ...overrides,
  };
}

describe('NotifyScheduleConflictsUseCase', () => {
  it('creates notifications only for conflicts of the saved event', async () => {
    const repository = new InMemoryNotificationRepository();
    const scheduleReader = new FakeNotificationScheduleReader([
      buildConflictRow({ eventId: 'event-1' }),
      buildConflictRow({ eventId: 'event-2' }),
    ]);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyScheduleConflictsUseCase(
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute({ eventId: 'event-1', from: '2026-07-20', to: '2026-07-20' });

    expect(repository.all).toHaveLength(1);
    expect(repository.all[0].getDedupeKey()).toBe('schedule_conflict:staff_overlap:event-1:2026-07-20');
    expect(delivery.delivered).toHaveLength(1);
    expect(scheduleReader.receivedWindow).toEqual({ from: '2026-07-20', to: '2026-07-20' });
  });

  it('does nothing when the reader reports no conflicts for the event', async () => {
    const repository = new InMemoryNotificationRepository();
    const scheduleReader = new FakeNotificationScheduleReader([buildConflictRow({ eventId: 'event-2' })]);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyScheduleConflictsUseCase(
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute({ eventId: 'event-1', from: '2026-07-20', to: '2026-07-20' });

    expect(repository.all).toHaveLength(0);
    expect(delivery.delivered).toHaveLength(0);
  });

  it('does not duplicate a notification already stored for the same conflict', async () => {
    const repository = new InMemoryNotificationRepository();
    const scheduleReader = new FakeNotificationScheduleReader([buildConflictRow({ eventId: 'event-1' })]);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyScheduleConflictsUseCase(
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute({ eventId: 'event-1', from: '2026-07-20', to: '2026-07-20' });
    await useCase.execute({ eventId: 'event-1', from: '2026-07-20', to: '2026-07-20' });

    expect(repository.all).toHaveLength(1);
    expect(delivery.delivered).toHaveLength(1);
  });
});
