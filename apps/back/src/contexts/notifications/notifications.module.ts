import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '../schedule/schedule.module';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentOrmEntity } from '../documents/infrastructure/persistence/document.orm-entity';
import { StaffDocumentOrmEntity } from '../staff/infrastructure/persistence/staff-document.orm-entity';
import { StaffMemberOrmEntity } from '../staff/infrastructure/persistence/staff-member.orm-entity';
import { NotificationOrmEntity } from './infrastructure/persistence/notification.orm-entity';
import { NotificationEventRetryOrmEntity } from './infrastructure/persistence/notification-event-retry.orm-entity';
import { TypeOrmNotificationEventRetryRepository } from './infrastructure/persistence/typeorm-notification-event-retry.repository';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/typeorm-notification.repository';
import { TypeOrmNotificationDocumentReader } from './infrastructure/persistence/typeorm-notification-document-reader';
import { TypeOrmNotificationStaffReader } from './infrastructure/persistence/typeorm-notification-staff-reader';
import { ScheduleBoardNotificationReader } from './infrastructure/schedule/schedule-board-notification-reader';
import { NoopNotificationDelivery } from './infrastructure/delivery/noop-notification-delivery';
import { CheckDuplicateDocumentDetector } from './infrastructure/documents/check-duplicate-document-detector';
import { NotificationEventSubscriber } from './infrastructure/events/notification-event-subscriber';
import { DailyNotificationScanScheduler } from './infrastructure/scheduling/daily-notification-scan.scheduler';
import { NotificationEventRetryScheduler } from './infrastructure/scheduling/notification-event-retry.scheduler';
import { NotificationsController } from './infrastructure/http/notifications.controller';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { NOTIFICATION_DOCUMENT_READER } from './domain/notification-document-reader.port';
import { NOTIFICATION_STAFF_READER } from './domain/notification-staff-reader.port';
import { NOTIFICATION_SCHEDULE_READER } from './domain/notification-schedule-reader.port';
import { NOTIFICATION_DELIVERY } from './domain/notification-delivery.port';
import { DOCUMENT_DUPLICATE_DETECTOR } from './domain/document-duplicate-detector.port';
import { ScanForNotificationsUseCase } from './application/scan-for-notifications/scan-for-notifications.use-case';
import { PurgeReadNotificationsUseCase } from './application/purge-read-notifications/purge-read-notifications.use-case';
import { ListNotificationsUseCase } from './application/list-notifications/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/count-unread-notifications/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/mark-notification-read/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { ResolveNotificationUseCase } from './application/resolve-notification/resolve-notification.use-case';
import { NotifyDuplicateDocumentUseCase } from './application/notify-duplicate-document/notify-duplicate-document.use-case';
import { NotifyFailedExtractionUseCase } from './application/notify-failed-extraction/notify-failed-extraction.use-case';
import { NotifyScheduleConflictsUseCase } from './application/notify-schedule-conflicts/notify-schedule-conflicts.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationOrmEntity,
      NotificationEventRetryOrmEntity,
      DocumentOrmEntity,
      StaffDocumentOrmEntity,
      StaffMemberOrmEntity,
    ]),
    ScheduleModule,
    DocumentsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    ScanForNotificationsUseCase,
    PurgeReadNotificationsUseCase,
    ListNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    ResolveNotificationUseCase,
    NotifyDuplicateDocumentUseCase,
    NotifyFailedExtractionUseCase,
    NotifyScheduleConflictsUseCase,
    DailyNotificationScanScheduler,
    NotificationEventRetryScheduler,
    NotificationEventSubscriber,
    TypeOrmNotificationEventRetryRepository,
    { provide: NOTIFICATION_REPOSITORY, useClass: TypeOrmNotificationRepository },
    { provide: NOTIFICATION_DOCUMENT_READER, useClass: TypeOrmNotificationDocumentReader },
    { provide: NOTIFICATION_STAFF_READER, useClass: TypeOrmNotificationStaffReader },
    { provide: NOTIFICATION_SCHEDULE_READER, useClass: ScheduleBoardNotificationReader },
    { provide: NOTIFICATION_DELIVERY, useClass: NoopNotificationDelivery },
    { provide: DOCUMENT_DUPLICATE_DETECTOR, useClass: CheckDuplicateDocumentDetector },
  ],
})
export class NotificationsModule {}
