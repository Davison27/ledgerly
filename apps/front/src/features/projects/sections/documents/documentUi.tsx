import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '../../../../data/documents';
import { STATUS_COLOR } from './documentFormat';

/** Etiqueta (Tag) de estado, coloreada y traducida. */
export function StatusTag({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();
  return (
    <Tag color={STATUS_COLOR[status]} style={{ marginInlineEnd: 0 }}>
      {t(`projects.documents.statuses.${status}`)}
    </Tag>
  );
}
