export type NotificationType =
  | 'document_overdue'
  | 'document_due_soon'
  | 'document_incomplete'
  | 'staff_document_expired'
  | 'staff_document_expiring'
  | 'schedule_event_upcoming'
  | 'schedule_conflict'
  | 'document_duplicate'
  | 'document_extraction_failed';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'document_overdue',
  'document_due_soon',
  'document_incomplete',
  'staff_document_expired',
  'staff_document_expiring',
  'schedule_event_upcoming',
  'schedule_conflict',
  'document_duplicate',
  'document_extraction_failed',
];
