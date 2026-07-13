import { useTranslation } from 'react-i18next';
import type { DocumentStatus, DocumentType } from '../../../../data/documents';

/** Formatea un importe en euros al estilo español y sin decimales. */
export function formatEUR(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

/** Color de preset de antd (Tag) para cada estado de documento. */
export const STATUS_COLOR: Record<DocumentStatus, string> = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'error',
};

/** Hook auxiliar para traducir el tipo de documento. */
export function useTypeLabel() {
  const { t } = useTranslation();
  return (type: DocumentType) => t(`projects.documents.types.${type}`);
}
