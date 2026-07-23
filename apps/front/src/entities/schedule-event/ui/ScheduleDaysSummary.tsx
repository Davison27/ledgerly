import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateRange } from '@/shared/lib/dates';
import type { ScheduleEventDayDto } from '../api/types';
import { summarizeDayTimes } from '../lib/days';

const { Text } = Typography;

export interface ScheduleDaysSummaryProps {
  days: ScheduleEventDayDto[];
}

export function ScheduleDaysSummary({ days }: ScheduleDaysSummaryProps) {
  const { t, i18n } = useTranslation();

  if (days.length === 0) return null;

  const start = days[0].date;
  const end = days[days.length - 1].date;
  const rangeLabel = formatDateRange(start, end, i18n.language);

  const daySummary = summarizeDayTimes(days);
  const timeLabel =
    daySummary.kind === 'mixed' ? t('calendar.days.mixedTimes') : (daySummary.label ?? t('calendar.days.fullDay'));

  return (
    <Flex gap={6} align="baseline" wrap>
      <Text>{rangeLabel}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {timeLabel}
      </Text>
    </Flex>
  );
}
