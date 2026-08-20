export type NotificationConflictKind =
  | 'staff_not_hired'
  | 'outside_project_dates'
  | 'staff_overlap'
  | 'project_not_active'
  | 'equipment_overallocated'
  | 'equipment_stock_unset';

export const NOTIFICATION_CONFLICT_KINDS: NotificationConflictKind[] = [
  'staff_not_hired',
  'outside_project_dates',
  'staff_overlap',
  'project_not_active',
  'equipment_overallocated',
  'equipment_stock_unset',
];
