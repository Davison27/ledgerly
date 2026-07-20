import { DocumentStatus } from './document-status';

/**
 * Derives the effective status of a document from its stored status and due date.
 *
 * A `pendiente` document whose `dueDate` has already passed (strictly before
 * `today`) is treated as `vencido` everywhere it is shown, without ever
 * writing that change back to storage. `pagado` is never overridden, and a
 * missing `dueDate` keeps the stored status as-is.
 *
 * Dates are compared as ISO `YYYY-MM-DD` strings, which sort lexicographically
 * the same as chronologically.
 */
export function deriveEffectiveStatus(
  status: DocumentStatus,
  dueDate: string | null,
  today: string,
): DocumentStatus {
  if (status === 'pendiente' && dueDate !== null && dueDate < today) {
    return 'vencido';
  }

  return status;
}

/** Today's date as an ISO `YYYY-MM-DD` string, matching the stored date format. */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
