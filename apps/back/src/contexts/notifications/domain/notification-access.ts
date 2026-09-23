export type NotificationPermissionLevel = 'none' | 'view' | 'edit';

export interface NotificationAccessSnapshot {
  projects: NotificationPermissionLevel;
  calendar: NotificationPermissionLevel;
  documents: NotificationPermissionLevel;
  staff: NotificationPermissionLevel;
  equipment: NotificationPermissionLevel;
}
