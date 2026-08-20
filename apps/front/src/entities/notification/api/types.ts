export type NotificationTypeDto =
  | 'document_overdue'
  | 'document_due_soon'
  | 'document_incomplete'
  | 'document_duplicate'
  | 'document_extraction_failed'
  | 'staff_document_expired'
  | 'staff_document_expiring'
  | 'schedule_event_upcoming'
  | 'schedule_conflict';

export type NotificationSeverityDto = 'error' | 'warning' | 'info';

export type NotificationResourceKindDto = 'document' | 'staff_member' | 'schedule_event' | 'none';

export type NotificationConflictKindDto =
  | 'staff_not_hired'
  | 'outside_project_dates'
  | 'staff_overlap'
  | 'project_not_active'
  | 'equipment_overallocated'
  | 'equipment_stock_unset';

export interface NotificationResourceDto {
  kind: NotificationResourceKindDto;
  id: string | null;
  projectId: string | null;
}

export interface NotificationContextDto {
  subject: string;
  related: string | null;
  date: string | null;
  amount: number | null;
  conflictKind: NotificationConflictKindDto | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationTypeDto;
  severity: NotificationSeverityDto;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
  resource: NotificationResourceDto;
  context: NotificationContextDto;
}

export interface NotificationPageDto {
  items: NotificationDto[];
  total: number;
  page: number;
  size: number;
  unreadCount: number;
}

export interface NotificationUnreadCountDto {
  count: number;
}

export interface ListNotificationsParams {
  page?: number;
  size?: number;
  status?: 'unread' | 'open' | 'resolved' | 'all';
}
