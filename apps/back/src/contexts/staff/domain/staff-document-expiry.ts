export type StaffDocumentExpiryStatus = 'valid' | 'expiring' | 'expired' | 'none';

export const EXPIRING_WINDOW_DAYS = 30;

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const limit = new Date(Date.UTC(year, month - 1, day + days));

  return [
    limit.getUTCFullYear(),
    String(limit.getUTCMonth() + 1).padStart(2, '0'),
    String(limit.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function classifyExpiry(
  earliestExpiryDate: string | null,
  today: string,
): StaffDocumentExpiryStatus {
  if (earliestExpiryDate === null) {
    return 'none';
  }

  if (earliestExpiryDate < today) {
    return 'expired';
  }

  return earliestExpiryDate <= addDays(today, EXPIRING_WINDOW_DAYS) ? 'expiring' : 'valid';
}
