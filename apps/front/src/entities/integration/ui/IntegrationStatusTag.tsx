import { useTranslation } from 'react-i18next';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import type { SemanticTone } from '@/shared/ui/SemanticTag';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import type { IntegrationStatusDto } from '../api/types';
import styles from './IntegrationStatusTag.module.css';

const STATUS_TONE: Record<IntegrationStatusDto, SemanticTone> = {
  connected: 'income',
  disconnected: 'neutral',
  error: 'overdue',
};

export interface IntegrationStatusTagProps {
  status: IntegrationStatusDto;
}

export function IntegrationStatusTag({ status }: IntegrationStatusTagProps) {
  const { t } = useTranslation();
  const colors = useSemanticColors();

  const dotColor = status === 'connected' ? colors.income : status === 'error' ? colors.overdue : colors.neutral;

  return (
    <SemanticTag tone={STATUS_TONE[status]}>
      <span className={styles.dot} style={{ backgroundColor: dotColor }} />
      {t(`workspace.integrations.status.${status}`)}
    </SemanticTag>
  );
}
