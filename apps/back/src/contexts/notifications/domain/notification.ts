import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { NOTIFICATION_TYPES, NotificationType } from './notification-type';
import { NOTIFICATION_SEVERITIES, NotificationSeverity } from './notification-severity';
import { NotificationContext } from './notification-context';
import { NotificationResource } from './notification-resource';

export interface NotificationProps {
  id: string;
  dedupeKey: string;
  type: NotificationType;
  severity: NotificationSeverity;
  context: NotificationContext;
  resource: NotificationResource;
  createdAt: Date;
  readAt: Date | null;
  emailSentAt: Date | null;
  resolvedAt?: Date | null;
}

export class Notification {
  private id: string;
  private dedupeKey: string;
  private type: NotificationType;
  private severity: NotificationSeverity;
  private context: NotificationContext;
  private resource: NotificationResource;
  private createdAt: Date;
  private readAt: Date | null;
  private emailSentAt: Date | null;
  private resolvedAt: Date | null;

  private constructor(props: NotificationProps) {
    this.id = props.id;
    this.dedupeKey = props.dedupeKey;
    this.type = props.type;
    this.severity = props.severity;
    this.context = props.context;
    this.resource = props.resource;
    this.createdAt = props.createdAt;
    this.readAt = props.readAt;
    this.emailSentAt = props.emailSentAt;
    this.resolvedAt = props.resolvedAt ?? null;
  }

  static create(props: NotificationProps): Notification {
    if (!NOTIFICATION_TYPES.includes(props.type)) {
      throw new InvalidValueException(`type must be one of ${NOTIFICATION_TYPES.join(', ')}`);
    }

    if (!NOTIFICATION_SEVERITIES.includes(props.severity)) {
      throw new InvalidValueException(`severity must be one of ${NOTIFICATION_SEVERITIES.join(', ')}`);
    }

    if (!props.dedupeKey.startsWith(`${props.type}:`)) {
      throw new InvalidValueException('dedupeKey must start with the notification type');
    }

    if (props.context.subject.trim().length === 0) {
      throw new InvalidValueException('context.subject must not be empty');
    }

    if (props.resource.kind === 'none' && props.resource.id !== null) {
      throw new InvalidValueException('resource.id must be null when resource.kind is none');
    }

    if (props.resource.kind !== 'none' && props.resource.id === null) {
      throw new InvalidValueException('resource.id is required when resource.kind is not none');
    }

    if (props.resource.kind === 'document' && props.resource.projectId === null) {
      throw new InvalidValueException('resource.projectId is required when resource.kind is document');
    }

    return new Notification(props);
  }

  static fromPrimitives(props: NotificationProps): Notification {
    return new Notification(props);
  }

  getId(): string {
    return this.id;
  }

  getDedupeKey(): string {
    return this.dedupeKey;
  }

  getType(): NotificationType {
    return this.type;
  }

  getSeverity(): NotificationSeverity {
    return this.severity;
  }

  getContext(): NotificationContext {
    return this.context;
  }

  getResource(): NotificationResource {
    return this.resource;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getReadAt(): Date | null {
    return this.readAt;
  }

  getEmailSentAt(): Date | null {
    return this.emailSentAt;
  }

  getResolvedAt(): Date | null {
    return this.resolvedAt;
  }

  markAsRead(at: Date): Notification {
    if (this.readAt !== null) {
      return this;
    }

    return new Notification({ ...this.toPrimitives(), readAt: at });
  }

  resolve(at: Date): Notification {
    if (this.resolvedAt !== null) return this;

    return new Notification({ ...this.toPrimitives(), resolvedAt: at, readAt: this.readAt ?? at });
  }

  toPrimitives(): NotificationProps {
    return {
      id: this.id,
      dedupeKey: this.dedupeKey,
      type: this.type,
      severity: this.severity,
      context: this.context,
      resource: this.resource,
      createdAt: this.createdAt,
      readAt: this.readAt,
      emailSentAt: this.emailSentAt,
      resolvedAt: this.resolvedAt,
    };
  }
}
