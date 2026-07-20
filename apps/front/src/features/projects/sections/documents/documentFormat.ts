import { useTranslation } from 'react-i18next';
import type { DocumentDirection, DocumentStatus, DocumentType } from '../../../../data/documents';

export function formatEUR(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export const STATUS_COLOR: Record<DocumentStatus, string> = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'error',
};

export const DIRECTION_COLOR: Record<DocumentDirection, string> = {
  ingreso: 'success',
  gasto: 'error',
};

export function useTypeLabel() {
  const { t } = useTranslation();
  return (type: DocumentType) => t(`projects.documents.types.${type}`);
}

export function useDirectionLabel() {
  const { t } = useTranslation();
  return (direction: DocumentDirection) => t(`projects.documents.directions.${direction}`);
}
