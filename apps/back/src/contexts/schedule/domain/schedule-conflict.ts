export type ScheduleConflictKind =
  | 'staff_not_hired'
  | 'outside_project_dates'
  | 'staff_overlap'
  | 'project_not_active'
  | 'product_overallocated'
  | 'product_stock_unset';

export const SCHEDULE_CONFLICT_KINDS: ScheduleConflictKind[] = [
  'staff_not_hired',
  'outside_project_dates',
  'staff_overlap',
  'project_not_active',
  'product_overallocated',
  'product_stock_unset',
];

export type ScheduleConflictSeverity = 'error' | 'info';

export interface ScheduleConflict {
  kind: ScheduleConflictKind;
  severity: ScheduleConflictSeverity;
  eventId: string;
  date: string | null;
  staffMemberId: string | null;
  productId: string | null;
  relatedEventId: string | null;
  stock: number | null;
  allocated: number | null;
}
