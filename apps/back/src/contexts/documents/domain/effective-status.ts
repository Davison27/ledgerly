import { DocumentStatus } from './document-status';

export function deriveEffectiveStatus(
  status: DocumentStatus,
  dueDate: string | null,
  today: string,
): DocumentStatus {
  if (status === 'pending' && dueDate !== null && dueDate < today) {
    return 'overdue';
  }

  return status;
}
