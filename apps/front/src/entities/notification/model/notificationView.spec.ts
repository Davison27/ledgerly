import { describe, expect, it } from 'vitest';
import type { NotificationView } from './notificationView';
import { groupBySeverity, mapNotificationDto, notificationTarget } from './notificationView';
import {
  notificationDescriptionKey,
  notificationDescriptionParams,
  notificationTitleKey,
} from './notificationText';

function view(resource: NotificationView['resource']): NotificationView {
  return {
    id: 'notification-1',
    type: 'document_overdue',
    severity: 'error',
    createdAt: new Date('2026-08-29T10:00:00.000Z'),
    readAt: null,
    resolvedAt: null,
    resource,
    context: {
      subject: 'Invoice 42',
      related: 'Acme',
      date: '2026-08-29',
      amount: 100,
      conflictKind: null,
    },
  };
}

describe('notification view model', () => {
  it('maps notification timestamps to Date instances', () => {
    const result = mapNotificationDto({
      ...view({ kind: 'none', id: null, projectId: null }),
      createdAt: '2026-08-29T10:00:00.000Z',
      readAt: '2026-08-29T11:00:00.000Z',
      resolvedAt: null,
    });

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.readAt).toBeInstanceOf(Date);
    expect(result.resolvedAt).toBeNull();
  });

  it('groups notifications in severity order without dropping empty groups', () => {
    const groups = groupBySeverity([
      view({ kind: 'none', id: null, projectId: null }),
      { ...view({ kind: 'none', id: null, projectId: null }), severity: 'info' },
    ]);

    expect(groups.map((group) => group.severity)).toEqual(['error', 'warning', 'info']);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].items).toHaveLength(0);
    expect(groups[2].items).toHaveLength(1);
  });

  it.each([
    [
      { kind: 'document', id: 'doc-1', projectId: 'project-1' },
      { kind: 'project', projectId: 'project-1' },
    ],
    [
      { kind: 'staff_member', id: 'staff-1', projectId: null },
      { kind: 'staffMember', staffMemberId: 'staff-1' },
    ],
    [{ kind: 'schedule_event', id: 'event-1', projectId: null }, { kind: 'calendar' }],
    [{ kind: 'none', id: null, projectId: null }, null],
  ] as const)('resolves notification target %j', (resource, target) => {
    expect(notificationTarget(view(resource))).toEqual(target);
  });

  it('builds translation keys and localized description parameters', () => {
    const notification = view({
      kind: 'project',
      id: 'project-1',
      projectId: 'project-1',
    } as never);

    expect(notificationTitleKey(notification.type)).toBe(
      'notifications.items.document_overdue.title',
    );
    expect(notificationDescriptionKey(notification.type)).toBe(
      'notifications.items.document_overdue.description',
    );
    expect(notificationDescriptionParams(notification, 'es-ES', () => 'conflicto')).toEqual({
      subject: 'Invoice 42',
      related: 'Acme',
      date: expect.stringContaining('29'),
      conflict: null,
    });
  });
});
