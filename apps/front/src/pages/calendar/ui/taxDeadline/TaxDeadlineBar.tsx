import type { CSSProperties } from 'react';
import { Flex, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import styles from './TaxDeadlineBar.module.css';

const { Text } = Typography;

export interface TaxDeadlineBarProps {
  deadline: TaxDeadlineDto;
  barKey: string;
  rowKey: string;
  span: number;
  variant: 'month' | 'week';
  onSelect: (deadline: TaxDeadlineDto) => void;
}

export function TaxDeadlineBar({
  deadline,
  barKey,
  rowKey,
  span,
  variant,
  onSelect,
}: TaxDeadlineBarProps) {
  const { t } = useTranslation();
  const colors = useSemanticColors();
  const statusLabel = t(`calendar.tax.status.${deadline.status}`);

  return (
    <div
      className={styles.bar}
      data-variant={variant}
      data-bar-key={barKey}
      data-row-key={rowKey}
      role="button"
      tabIndex={0}
      style={{ '--deadline-color': colors.accentCool } as CSSProperties}
      onClick={() => onSelect(deadline)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(deadline);
        }
      }}
    >
      <Flex align="center" gap={4} className={styles.titleRow}>
        <Text ellipsis className={styles.code}>
          {deadline.code}
        </Text>
        <Text ellipsis className={styles.title}>
          {deadline.title}
        </Text>
        {variant === 'month' && span >= 2 && <Tag className={styles.badge}>{statusLabel}</Tag>}
      </Flex>
      {variant === 'week' && (
        <Text ellipsis type="secondary" className={styles.project}>
          {deadline.projectName} · {statusLabel}
        </Text>
      )}
    </div>
  );
}
