import { Notification, NotificationProps } from './notification';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PROPS: NotificationProps = {
  id: 'notification-1',
  dedupeKey: 'document_overdue:doc-1',
  type: 'document_overdue',
  severity: 'error',
  context: { subject: 'Invoice 1', related: null, date: '2026-07-01', amount: 100, conflictKind: null },
  resource: { kind: 'document', id: 'doc-1', projectId: 'project-1' },
  createdAt: new Date('2026-07-10T00:00:00Z'),
  readAt: null,
  emailSentAt: null,
};

describe('Notification', () => {
  it('creates a notification with valid props', () => {
    const notification = Notification.create(BASE_PROPS);

    expect(notification.getId()).toBe('notification-1');
    expect(notification.getDedupeKey()).toBe('document_overdue:doc-1');
  });

  it('throws when the type is not a known type', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, type: 'not-a-type' as unknown as NotificationProps['type'] }),
    ).toThrow(InvalidValueException);
  });

  it('throws when the severity is not a known severity', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, severity: 'critical' as unknown as NotificationProps['severity'] }),
    ).toThrow(InvalidValueException);
  });

  it('throws when dedupeKey does not start with the notification type', () => {
    expect(() => Notification.create({ ...BASE_PROPS, dedupeKey: 'document_due_soon:doc-1' })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when the context subject is empty', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, context: { ...BASE_PROPS.context, subject: '   ' } }),
    ).toThrow(InvalidValueException);
  });

  it('throws when resource kind is none but an id is set', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, resource: { kind: 'none', id: 'doc-1', projectId: null } }),
    ).toThrow(InvalidValueException);
  });

  it('throws when resource kind is not none and id is null', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, resource: { kind: 'document', id: null, projectId: 'project-1' } }),
    ).toThrow(InvalidValueException);
  });

  it('throws when resource kind is document and projectId is null', () => {
    expect(() =>
      Notification.create({ ...BASE_PROPS, resource: { kind: 'document', id: 'doc-1', projectId: null } }),
    ).toThrow(InvalidValueException);
  });

  it('does not require a projectId for staff_member resources', () => {
    const notification = Notification.create({
      ...BASE_PROPS,
      dedupeKey: 'staff_document_expired:staff-doc-1',
      type: 'staff_document_expired',
      resource: { kind: 'staff_member', id: 'staff-1', projectId: null },
    });

    expect(notification.getResource().projectId).toBeNull();
  });

  describe('markAsRead', () => {
    it('sets the read date when the notification was unread', () => {
      const notification = Notification.create(BASE_PROPS);
      const readAt = new Date('2026-07-18T09:00:00Z');

      const read = notification.markAsRead(readAt);

      expect(read.getReadAt()).toEqual(readAt);
    });

    it('keeps the original read date when already read', () => {
      const firstReadAt = new Date('2026-07-11T00:00:00Z');
      const notification = Notification.create({ ...BASE_PROPS, readAt: firstReadAt });

      const read = notification.markAsRead(new Date('2026-07-18T09:00:00Z'));

      expect(read.getReadAt()).toEqual(firstReadAt);
      expect(read).toBe(notification);
    });
  });
});
