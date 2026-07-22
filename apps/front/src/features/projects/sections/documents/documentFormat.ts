import { useTranslation } from 'react-i18next';
import type { DocumentDirection, DocumentStatus, DocumentType } from '../../../../data/documents';
import type { SemanticTone } from '../../../../components/ui/SemanticTag';

export function formatEUR(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export const STATUS_TONE: Record<DocumentStatus, SemanticTone> = {
  pagado: 'paid',
  pendiente: 'pending',
  vencido: 'overdue',
};

export const DIRECTION_TONE: Record<DocumentDirection, SemanticTone> = {
  ingreso: 'income',
  gasto: 'expense',
};

export function useTypeLabel() {
  const { t } = useTranslation();
  return (type: DocumentType) => t(`projects.documents.types.${type}`);
}

export function useDirectionLabel() {
  const { t } = useTranslation();
  return (direction: DocumentDirection) => t(`projects.documents.directions.${direction}`);
}
