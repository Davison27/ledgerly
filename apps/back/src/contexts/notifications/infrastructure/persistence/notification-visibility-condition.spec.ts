import { NotificationAccessSnapshot } from '../../domain/notification-access';
import { notificationVisibilityCondition } from './notification-visibility-condition';

describe('notificationVisibilityCondition', () => {
  it('requires owning-section access and nested parent access before returning a notification', () => {
    const access: NotificationAccessSnapshot = {
      projects: 'view',
      calendar: 'view',
      documents: 'view',
      staff: 'none',
      equipment: 'none',
    };

    const condition = notificationVisibilityCondition(access, 'notification');

    expect(condition).toContain("notification.resource_kind = 'document' AND TRUE AND TRUE");
    expect(condition).toContain("notification.resource_kind = 'staff_member' AND FALSE AND TRUE");
    expect(condition).toContain("notification.resource_kind = 'none' AND notification.type = 'document_extraction_failed' AND TRUE");
    expect(condition).toContain('schedule_event.project_id = notification.resource_project_id');
    expect(condition).toContain('NOT EXISTS (\n            SELECT 1 FROM schedule_event_staff');
    expect(condition).toContain('NOT EXISTS (\n            SELECT 1 FROM schedule_event_equipment');
  });

  it('hides schedule notifications when calendar or projects are denied', () => {
    const access: NotificationAccessSnapshot = {
      projects: 'view',
      calendar: 'none',
      documents: 'none',
      staff: 'view',
      equipment: 'view',
    };

    const condition = notificationVisibilityCondition(access, 'notifications');

    expect(condition).toContain("notifications.resource_kind = 'schedule_event'\n      AND TRUE\n      AND FALSE");
    expect(condition).toContain("notifications.resource_kind = 'document' AND TRUE AND FALSE");
    expect(condition).toContain("notifications.resource_kind = 'staff_member' AND TRUE AND FALSE");
  });
});
