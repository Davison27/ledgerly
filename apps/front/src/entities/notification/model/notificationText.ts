import { formatDate } from '@/shared/lib/dates';
import type { NotificationConflictKindDto, NotificationTypeDto } from '../api/types';
import type { NotificationView } from './notificationView';

export function notificationTitleKey(type: NotificationTypeDto): string {
  return `notifications.items.${type}.title`;
}

export function notificationDescriptionKey(type: NotificationTypeDto): string {
  return `notifications.items.${type}.description`;
}

export interface NotificationDescriptionParams {
  subject: string;
  related: string | null;
  date: string | null;
  conflict: string | null;
  [key: string]: string | null;
}

export function notificationDescriptionParams(
  view: NotificationView,
  locale: string,
  translateConflictKind: (kind: NotificationConflictKindDto) => string,
): NotificationDescriptionParams {
  const { context } = view;
  return {
    subject: context.subject,
    related: context.related,
    date: context.date ? formatDate(context.date, locale) : null,
    conflict: context.conflictKind ? translateConflictKind(context.conflictKind) : null,
  };
}
