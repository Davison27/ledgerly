import { useTranslation } from 'react-i18next';
import type { DocumentDirection, DocumentStatus } from '../model/documents';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { DIRECTION_TONE, STATUS_TONE } from '../model/documentFormat';

export function StatusTag({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();
  return (
    <SemanticTag tone={STATUS_TONE[status]}>
      {t(`projects.documents.statuses.${status}`)}
    </SemanticTag>
  );
}

export function DirectionTag({ direction }: { direction: DocumentDirection }) {
  const { t } = useTranslation();
  return (
    <SemanticTag tone={DIRECTION_TONE[direction]}>
      {t(`projects.documents.directions.${direction}`)}
    </SemanticTag>
  );
}
