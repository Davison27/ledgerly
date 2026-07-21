import dayjs from 'dayjs';
import type { SemanticTone } from '../../../components/ui/SemanticTag';

export type StaffDocumentExpiryStatus = 'valid' | 'expiring' | 'expired' | 'none';

const EXPIRING_WINDOW_DAYS = 30;

const TONE_BY_STATUS: Record<StaffDocumentExpiryStatus, SemanticTone> = {
  expired: 'overdue',
  expiring: 'pending',
  valid: 'paid',
  none: 'neutral',
};

/** `overdue`/`expiring`/`valid`/`none`, from a document's `expiryDate` (D6). */
export function getExpiryStatus(expiryDate: string | null): StaffDocumentExpiryStatus {
  if (!expiryDate) return 'none';
  const today = dayjs().startOf('day');
  const expiry = dayjs(expiryDate);
  if (expiry.isBefore(today)) return 'expired';
  if (expiry.diff(today, 'day') <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'valid';
}

export function getExpiryTone(expiryDate: string | null): SemanticTone {
  return TONE_BY_STATUS[getExpiryStatus(expiryDate)];
}
