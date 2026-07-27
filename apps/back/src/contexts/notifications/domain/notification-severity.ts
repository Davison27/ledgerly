export type NotificationSeverity = 'error' | 'warning' | 'info';

export const NOTIFICATION_SEVERITIES: NotificationSeverity[] = ['error', 'warning', 'info'];

export const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function compareBySeverity(a: NotificationSeverity, b: NotificationSeverity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}
