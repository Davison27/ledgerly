import { useTranslation } from 'react-i18next';
import type { DocumentDirection, DocumentStatus, DocumentType } from './documents';
import type { SemanticTone } from '@/shared/ui/SemanticTag';

export function formatEUR(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export const STATUS_TONE: Record<DocumentStatus, SemanticTone> = {
  paid: 'paid',
  pending: 'pending',
  overdue: 'overdue',
};

export const DIRECTION_TONE: Record<DocumentDirection, SemanticTone> = {
  income: 'income',
  expense: 'expense',
};

export function useTypeLabel() {
  const { t } = useTranslation();
  return (type: DocumentType) => t(`projects.documents.types.${type}`);
}

export function useDirectionLabel() {
  const { t } = useTranslation();
  return (direction: DocumentDirection) => t(`projects.documents.directions.${direction}`);
}
