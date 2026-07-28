import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NOTIFICATION_DELIVERY, NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  NOTIFICATION_DOCUMENT_READER,
  NotificationDocumentReader,
} from '../../domain/notification-document-reader.port';
import { NOTIFICATION_STAFF_READER, NotificationStaffReader } from '../../domain/notification-staff-reader.port';
import {
  NOTIFICATION_SCHEDULE_READER,
  NotificationScheduleReader,
} from '../../domain/notification-schedule-reader.port';
import { Notification } from '../../domain/notification';
import { NotificationDraft } from '../../domain/notification-draft';
import {
  DOCUMENT_DUE_SOON_DAYS,
  SCHEDULE_CONFLICT_WINDOW_DAYS,
  SCHEDULE_UPCOMING_DAYS,
  STAFF_DOCUMENT_EXPIRING_DAYS,
} from '../../domain/notification-thresholds';
import { buildDueNotifications, buildIncompleteNotifications } from '../../domain/document-notification-rules';
import { buildStaffDocumentNotifications } from '../../domain/staff-notification-rules';
import {
  buildConflictNotifications,
  buildUpcomingEventNotifications,
} from '../../domain/schedule-notification-rules';
import { ScanForNotificationsResult } from './scan-for-notifications.result';

function addDaysToIsoDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

@Injectable()
export class ScanForNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_DOCUMENT_READER) private readonly documentReader: NotificationDocumentReader,
    @Inject(NOTIFICATION_STAFF_READER) private readonly staffReader: NotificationStaffReader,
    @Inject(NOTIFICATION_SCHEDULE_READER) private readonly scheduleReader: NotificationScheduleReader,
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY) private readonly delivery: NotificationDelivery,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(): Promise<ScanForNotificationsResult> {
    const today = this.clock.todayIso();
    const dueSoonLimit = addDaysToIsoDate(today, DOCUMENT_DUE_SOON_DAYS);
    const staffExpiringLimit = addDaysToIsoDate(today, STAFF_DOCUMENT_EXPIRING_DAYS);
    const upcomingEventsLimit = addDaysToIsoDate(today, SCHEDULE_UPCOMING_DAYS);
    const conflictWindowLimit = addDaysToIsoDate(today, SCHEDULE_CONFLICT_WINDOW_DAYS);

    const [pendingDue, incompleteInvoices, expiringStaffDocuments, upcomingEvents, conflicts] = await Promise.all([
      this.documentReader.findPendingDueUpTo(dueSoonLimit),
      this.documentReader.findInvoicesWithoutInvoiceNumber(),
      this.staffReader.findExpiringUpTo(staffExpiringLimit),
      this.scheduleReader.findUpcomingEvents(today, upcomingEventsLimit),
      this.scheduleReader.findBlockingConflicts(today, conflictWindowLimit),
    ]);

    const drafts: NotificationDraft[] = [
      ...buildDueNotifications(pendingDue, today),
      ...buildIncompleteNotifications(incompleteInvoices),
      ...buildStaffDocumentNotifications(expiringStaffDocuments, today),
      ...buildUpcomingEventNotifications(upcomingEvents),
      ...buildConflictNotifications(conflicts),
    ];

    const now = this.clock.now();
    const candidates = drafts.map((draft) =>
      Notification.create({
        ...draft,
        id: this.idGenerator.generate(),
        createdAt: now,
        readAt: null,
        emailSentAt: null,
      }),
    );

    const created = await this.repository.insertIfAbsent(candidates);
    await this.delivery.deliver(created);

    return { created: created.length };
  }
}
