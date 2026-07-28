import type { SemanticTone } from '@/shared/ui/SemanticTag';
import type {
  NotificationContextDto,
  NotificationDto,
  NotificationResourceDto,
  NotificationSeverityDto,
  NotificationTypeDto,
} from '../api/types';

export interface NotificationView {
  id: string;
  type: NotificationTypeDto;
  severity: NotificationSeverityDto;
  createdAt: Date;
  readAt: Date | null;
  resource: NotificationResourceDto;
  context: NotificationContextDto;
}

export function mapNotificationDto(dto: NotificationDto): NotificationView {
  return {
    id: dto.id,
    type: dto.type,
    severity: dto.severity,
    createdAt: new Date(dto.createdAt),
    readAt: dto.readAt ? new Date(dto.readAt) : null,
    resource: dto.resource,
    context: dto.context,
  };
}

export const SEVERITY_TONE: Record<NotificationSeverityDto, SemanticTone> = {
  error: 'overdue',
  warning: 'pending',
  info: 'info',
};

const SEVERITY_ORDER: NotificationSeverityDto[] = ['error', 'warning', 'info'];

export interface NotificationSeverityGroup {
  severity: NotificationSeverityDto;
  items: NotificationView[];
}

export function groupBySeverity(views: NotificationView[]): NotificationSeverityGroup[] {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    items: views.filter((view) => view.severity === severity),
  }));
}

export type NotificationTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'staffMember'; staffMemberId: string }
  | { kind: 'calendar' }
  | null;

export function notificationTarget(view: NotificationView): NotificationTarget {
  switch (view.resource.kind) {
    case 'document':
      return view.resource.projectId ? { kind: 'project', projectId: view.resource.projectId } : null;
    case 'staff_member':
      return view.resource.id ? { kind: 'staffMember', staffMemberId: view.resource.id } : null;
    case 'schedule_event':
      return { kind: 'calendar' };
    case 'none':
      return null;
  }
}
