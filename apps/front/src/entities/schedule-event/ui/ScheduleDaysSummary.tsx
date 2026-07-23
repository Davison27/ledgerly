import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Numeric } from '@/shared/ui/Numeric';
import type { ScheduleEventDayDto } from '../api/types';
import { formatDayTime } from '../lib/days';

const { Text } = Typography;

export interface ScheduleDaysSummaryProps {
  days: ScheduleEventDayDto[];
}

export function ScheduleDaysSummary({ days }: ScheduleDaysSummaryProps) {
  const { t } = useTranslation();

  if (days.length === 0) return null;

  const start = days[0].date;
  const end = days[days.length - 1].date;
  const rangeLabel = start === end ? start : t('calendar.days.range', { start, end });

  const firstTime = formatDayTime(days[0]);
  const sameTimeEveryDay = days.every((day) => formatDayTime(day) === firstTime);
  const timeLabel = sameTimeEveryDay
    ? (firstTime ?? t('calendar.days.fullDay'))
    : t('calendar.days.mixedTimes');

  return (
    <Flex gap={6} align="baseline" wrap>
      <Numeric>{rangeLabel}</Numeric>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {timeLabel}
      </Text>
    </Flex>
  );
}
