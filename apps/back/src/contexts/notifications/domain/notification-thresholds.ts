export const DOCUMENT_DUE_SOON_DAYS = 7;
export const STAFF_DOCUMENT_EXPIRING_DAYS = 30;
export const SCHEDULE_UPCOMING_DAYS = 3;
export const SCHEDULE_CONFLICT_WINDOW_DAYS = 60;
export const READ_RETENTION_DAYS = 90;

export function retentionThreshold(now: Date, days: number): Date {
  const threshold = new Date(now.getTime());
  threshold.setUTCDate(threshold.getUTCDate() - days);

  return threshold;
}
