import { useTranslation } from 'react-i18next';
import type { DocumentStatus, DocumentType } from '../../../../data/documents';

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

export function useTypeLabel() {
  const { t } = useTranslation();
  return (type: DocumentType) => t(`projects.documents.types.${type}`);
}
