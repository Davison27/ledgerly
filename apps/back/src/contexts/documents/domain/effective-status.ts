import { DocumentStatus } from './document-status';

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
