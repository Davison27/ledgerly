export type NotificationResourceKind = 'document' | 'staff_member' | 'schedule_event' | 'none';

export interface NotificationResource {
  kind: NotificationResourceKind;
  id: string | null;
  projectId: string | null;
}
