import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Flex, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { listScheduleEvents, ScheduleDaysSummary, type ScheduleEventDto } from '@/entities/schedule-event';
import { EmptyHint } from '@/shared/ui/EmptyHint';

const { Text } = Typography;

const UPCOMING_WINDOW_DAYS = 30;
const MAX_ITEMS = 5;

export function UpcomingScheduleCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const from = dayjs().format('YYYY-MM-DD');
    const to = dayjs().add(UPCOMING_WINDOW_DAYS, 'day').format('YYYY-MM-DD');
    setLoading(true);
    setError(false);
    listScheduleEvents({ from, to })
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = [...events]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, MAX_ITEMS);

  const goToCalendar = () => void navigate({ to: '/calendar' });

  return (
    <Card
      size="small"
      title={t('dashboard.upcomingSchedule.title')}
      extra={
        <Button type="link" size="small" onClick={goToCalendar}>
          {t('dashboard.upcomingSchedule.viewAll')}
        </Button>
      }
      style={{ flex: '1 1 320px', minWidth: 300 }}
      loading={loading}
    >
      {!loading && error ? (
        <Text type="secondary">{t('dashboard.upcomingSchedule.error')}</Text>
      ) : !loading && upcoming.length === 0 ? (
        <EmptyHint icon={<CalendarOutlined />} title={t('dashboard.upcomingSchedule.empty')} />
      ) : (
        <Flex vertical gap={8}>
          {upcoming.map((event) => (
            <Flex key={event.id} vertical gap={2} style={{ cursor: 'pointer' }} onClick={goToCalendar}>
              <Text strong ellipsis>
                {event.title?.trim() || event.project.name}
              </Text>
              <ScheduleDaysSummary days={event.days} />
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
