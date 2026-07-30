import { Notification } from '../../domain/notification';
import { NotificationType } from '../../domain/notification-type';
import { NotificationSeverity } from '../../domain/notification-severity';
import { NotificationConflictKind } from '../../domain/notification-conflict-kind';
import { NotificationResourceKind } from '../../domain/notification-resource';
import { NotificationListRow } from '../../domain/notification-list-row';
import { NotificationOrmEntity } from './notification.orm-entity';

export class NotificationMapper {
  static toDomain(orm: NotificationOrmEntity): Notification {
    return Notification.fromPrimitives({
      id: orm.id,
      dedupeKey: orm.dedupeKey,
      type: orm.type as NotificationType,
      severity: orm.severity as NotificationSeverity,
      context: {
        subject: orm.subject,
        related: orm.related,
        date: orm.contextDate,
        amount: orm.contextAmount != null ? Number(orm.contextAmount) : null,
        conflictKind: orm.contextConflictKind as NotificationConflictKind | null,
      },
      resource: {
        kind: orm.resourceKind as NotificationResourceKind,
        id: orm.resourceId,
        projectId: orm.resourceProjectId,
      },
      createdAt: orm.createdAt,
      readAt: orm.readAt,
      emailSentAt: orm.emailSentAt,
      resolvedAt: orm.resolvedAt,
    });
  }

  static toOrm(notification: Notification): NotificationOrmEntity {
    const primitives = notification.toPrimitives();
    const orm = new NotificationOrmEntity();

    orm.id = primitives.id;
    orm.dedupeKey = primitives.dedupeKey;
    orm.type = primitives.type;
    orm.severity = primitives.severity;
    orm.subject = primitives.context.subject;
    orm.related = primitives.context.related;
    orm.contextDate = primitives.context.date;
    orm.contextAmount = primitives.context.amount != null ? primitives.context.amount.toString() : null;
    orm.contextConflictKind = primitives.context.conflictKind;
    orm.resourceKind = primitives.resource.kind;
    orm.resourceId = primitives.resource.id;
    orm.resourceProjectId = primitives.resource.projectId;
    orm.createdAt = primitives.createdAt;
    orm.readAt = primitives.readAt;
    orm.emailSentAt = primitives.emailSentAt;
    orm.resolvedAt = primitives.resolvedAt ?? null;

    return orm;
  }

  static toListRow(orm: NotificationOrmEntity): NotificationListRow {
    return {
      id: orm.id,
      type: orm.type as NotificationType,
      severity: orm.severity as NotificationSeverity,
      subject: orm.subject,
      related: orm.related,
      date: orm.contextDate,
      amount: orm.contextAmount != null ? Number(orm.contextAmount) : null,
      conflictKind: orm.contextConflictKind as NotificationConflictKind | null,
      resourceKind: orm.resourceKind as NotificationResourceKind,
      resourceId: orm.resourceId,
      resourceProjectId: orm.resourceProjectId,
      createdAt: orm.createdAt,
      readAt: orm.readAt,
      resolvedAt: orm.resolvedAt,
    };
  }
}
