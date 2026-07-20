import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentDirection, DocumentStatus } from '../../../../data/documents';
import { DIRECTION_COLOR, STATUS_COLOR } from './documentFormat';

export function StatusTag({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();
  return (
    <Tag color={STATUS_COLOR[status]} style={{ marginInlineEnd: 0 }}>
      {t(`projects.documents.statuses.${status}`)}
    </Tag>
  );
}

export function DirectionTag({ direction }: { direction: DocumentDirection }) {
  const { t } = useTranslation();
  return (
    <Tag color={DIRECTION_COLOR[direction]} style={{ marginInlineEnd: 0 }}>
      {t(`projects.documents.directions.${direction}`)}
    </Tag>
  );
}
