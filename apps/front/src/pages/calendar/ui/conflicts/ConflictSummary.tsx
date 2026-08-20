import { Flex, Popover, Tag, Typography } from 'antd';
import { ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ScheduleBoardSummaryDto, ScheduleConflictKind } from '@/entities/schedule-event';
import { SPACE } from '@/shared/config/theme';
import styles from './ConflictSummary.module.css';

const { Text } = Typography;

const CONFLICT_KINDS: ScheduleConflictKind[] = [
  'staff_not_hired',
  'outside_project_dates',
  'staff_overlap',
  'project_not_active',
  'equipment_overallocated',
  'equipment_stock_unset',
];

export interface ConflictSummaryProps {
  summary: ScheduleBoardSummaryDto | null;
}

export function ConflictSummary({ summary }: ConflictSummaryProps) {
  const { t } = useTranslation();

  const errorCount = summary?.errorCount ?? 0;
  const infoCount = summary?.infoCount ?? 0;
  const kindsWithCount = CONFLICT_KINDS.filter((kind) => (summary?.byKind[kind] ?? 0) > 0);

  const content =
    kindsWithCount.length === 0 ? (
      <Text type="secondary">{t('calendar.conflicts.none')}</Text>
    ) : (
      <Flex vertical gap={4}>
        {kindsWithCount.map((kind) => (
          <Flex key={kind} justify="space-between" gap={16}>
            <Text>{t(`calendar.conflicts.kind.${kind}`)}</Text>
            <Text strong>{summary?.byKind[kind]}</Text>
          </Flex>
        ))}
      </Flex>
    );

  return (
    <Popover title={t('calendar.conflicts.title')} content={content} trigger="click">
      <Flex align="center" gap={SPACE.md} className={styles.trigger}>
        <Flex align="center" gap={4}>
          <ExclamationCircleOutlined className={styles.errorIcon} />
          <Tag color={errorCount > 0 ? 'error' : 'default'}>{errorCount}</Tag>
        </Flex>
        <Flex align="center" gap={4}>
          <InfoCircleOutlined className={styles.warningIcon} />
          <Tag color={infoCount > 0 ? 'warning' : 'default'}>{infoCount}</Tag>
        </Flex>
      </Flex>
    </Popover>
  );
}
