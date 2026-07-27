import { ScanForNotificationsUseCase } from './scan-for-notifications.use-case';
import { NotificationRepository } from '../../domain/notification.repository';
import { NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  NotificationDocumentReader,
  NotificationDocumentRow,
} from '../../domain/notification-document-reader.port';
import {
  NotificationStaffReader,
  NotificationStaffDocumentRow,
} from '../../domain/notification-staff-reader.port';
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
    return Promise.resolve(this.notifications.filter((notification) => notification.getReadAt() === null).length);
  }

  markAllRead(): Promise<void> {
    return Promise.resolve();
  }

  deleteReadBefore(): Promise<number> {
    return Promise.resolve(0);
  }

  get count(): number {
    return this.notifications.length;
  }
}

class FakeNotificationDocumentReader implements NotificationDocumentReader {
  public receivedLimitDate: string | undefined;

  constructor(
    private readonly pendingDue: NotificationDocumentRow[] = [],
    private readonly incomplete: NotificationDocumentRow[] = [],
  ) {}

  findPendingDueUpTo(limitDate: string): Promise<NotificationDocumentRow[]> {
    this.receivedLimitDate = limitDate;
    return Promise.resolve(this.pendingDue);
  }

  findInvoicesWithoutInvoiceNumber(): Promise<NotificationDocumentRow[]> {
    return Promise.resolve(this.incomplete);
  }
}

class FakeNotificationStaffReader implements NotificationStaffReader {
  constructor(private readonly rows: NotificationStaffDocumentRow[] = []) {}

  findExpiringUpTo(): Promise<NotificationStaffDocumentRow[]> {
    return Promise.resolve(this.rows);
  }
}

class FakeNotificationScheduleReader implements NotificationScheduleReader {
  constructor(
    private readonly upcomingEvents: NotificationScheduleEventRow[] = [],
    private readonly conflicts: NotificationScheduleConflictRow[] = [],
  ) {}

  findUpcomingEvents(): Promise<NotificationScheduleEventRow[]> {
    return Promise.resolve(this.upcomingEvents);
  }

  findBlockingConflicts(): Promise<NotificationScheduleConflictRow[]> {
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

function buildPendingDueRow(overrides: Partial<NotificationDocumentRow> = {}): NotificationDocumentRow {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice 1',
    amount: 100,
    dueDate: '2026-07-01',
    type: 'factura',
    ...overrides,
  };
}

function buildStaffRow(overrides: Partial<NotificationStaffDocumentRow> = {}): NotificationStaffDocumentRow {
  return {
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    staffMemberName: 'Ana García',
    name: 'DNI',
    expiryDate: '2026-07-01',
    ...overrides,
  };
}

describe('ScanForNotificationsUseCase', () => {
  it('creates notifications on the first pass and none on a second, identical pass', async () => {
    const repository = new InMemoryNotificationRepository();
    const documentReader = new FakeNotificationDocumentReader([buildPendingDueRow()]);
    const staffReader = new FakeNotificationStaffReader();
    const scheduleReader = new FakeNotificationScheduleReader();
    const delivery = new FakeNotificationDelivery();
    const useCase = new ScanForNotificationsUseCase(
      documentReader,
      staffReader,
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T07:00:00Z')),
      new SequentialIdGenerator(),
    );

    const first = await useCase.execute();
    const second = await useCase.execute();

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(repository.count).toBe(1);
    expect(delivery.delivered).toHaveLength(1);
  });

  it('aggregates drafts from every source in a single pass', async () => {
    const repository = new InMemoryNotificationRepository();
    const documentReader = new FakeNotificationDocumentReader(
      [buildPendingDueRow({ id: 'doc-1' })],
      [buildPendingDueRow({ id: 'doc-2' })],
    );
    const staffReader = new FakeNotificationStaffReader([buildStaffRow()]);
    const scheduleReader = new FakeNotificationScheduleReader(
      [{ eventId: 'event-1', projectId: 'project-1', projectName: 'Project One', title: null, date: '2026-07-20' }],
      [
        {
          eventId: 'event-1',
          projectId: 'project-1',
          projectName: 'Project One',
          title: null,
          date: '2026-07-20',
          kind: 'staff_overlap',
        },
      ],
    );
    const delivery = new FakeNotificationDelivery();
    const useCase = new ScanForNotificationsUseCase(
      documentReader,
      staffReader,
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T07:00:00Z')),
      new SequentialIdGenerator(),
    );

    const result = await useCase.execute();

    expect(result.created).toBe(5);
  });

  it('asks the document reader for pending documents due within the configured window', async () => {
    const repository = new InMemoryNotificationRepository();
    const documentReader = new FakeNotificationDocumentReader();
    const staffReader = new FakeNotificationStaffReader();
    const scheduleReader = new FakeNotificationScheduleReader();
    const delivery = new FakeNotificationDelivery();
    const useCase = new ScanForNotificationsUseCase(
      documentReader,
      staffReader,
      scheduleReader,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T07:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute();

    expect(documentReader.receivedLimitDate).toBe('2026-07-25');
  });
});
