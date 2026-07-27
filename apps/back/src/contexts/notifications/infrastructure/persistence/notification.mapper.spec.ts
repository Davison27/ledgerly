import { NotificationMapper } from './notification.mapper';
import { Notification } from '../../domain/notification';

function buildNotification(amount: number | null = 1210.55): Notification {
  return Notification.create({
    id: 'notification-1',
    dedupeKey: 'document_overdue:doc-1',
    type: 'document_overdue',
    severity: 'error',
    context: { subject: 'Invoice 1', related: null, date: '2026-07-01', amount, conflictKind: null },
    resource: { kind: 'document', id: 'doc-1', projectId: 'project-1' },
    createdAt: new Date('2026-07-10T00:00:00Z'),
    readAt: null,
    emailSentAt: null,
  });
}

describe('NotificationMapper', () => {
  it('stores the numeric amount as a string and converts it back to a number', () => {
    const orm = NotificationMapper.toOrm(buildNotification());

    expect(orm.contextAmount).toBe('1210.55');
    expect(NotificationMapper.toDomain(orm).getContext().amount).toBe(1210.55);
  });

  it('keeps a null amount as null in both directions', () => {
    const orm = NotificationMapper.toOrm(buildNotification(null));

    expect(orm.contextAmount).toBeNull();
    expect(NotificationMapper.toDomain(orm).getContext().amount).toBeNull();
  });

  it('maps an orm row into a flat list row', () => {
    const orm = NotificationMapper.toOrm(buildNotification());

    expect(NotificationMapper.toListRow(orm)).toEqual({
      id: 'notification-1',
      type: 'document_overdue',
      severity: 'error',
      subject: 'Invoice 1',
      related: null,
      date: '2026-07-01',
      amount: 1210.55,
      conflictKind: null,
      resourceKind: 'document',
      resourceId: 'doc-1',
      resourceProjectId: 'project-1',
      createdAt: orm.createdAt,
      readAt: null,
    });
  });
});
