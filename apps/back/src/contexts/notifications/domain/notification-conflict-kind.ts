export type NotificationConflictKind =
  | 'staff_not_hired'
  | 'outside_project_dates'
  | 'staff_overlap'
  | 'project_not_active'
  | 'product_overallocated'
  | 'product_stock_unset';

export const NOTIFICATION_CONFLICT_KINDS: NotificationConflictKind[] = [
  'staff_not_hired',
  'outside_project_dates',
  'staff_overlap',
  'project_not_active',
  'product_overallocated',
  'product_stock_unset',
];
