import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Flex, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { scheduleQueries, ScheduleDaysSummary } from '@/entities/schedule-event';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import dashboard from '../dashboard.module.css';
import styles from './UpcomingScheduleCard.module.css';

const { Text } = Typography;

const UPCOMING_WINDOW_DAYS = 30;
const MAX_ITEMS = 5;

export function UpcomingScheduleCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const range = useMemo(
    () => ({
      from: dayjs().format('YYYY-MM-DD'),
      to: dayjs().add(UPCOMING_WINDOW_DAYS, 'day').format('YYYY-MM-DD'),
    }),
    [],
  );
  const {
    data: events,
    isPending: loading,
    isError: error,
  } = useQuery(scheduleQueries.events(range));

  const upcoming = [...(events ?? [])]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, MAX_ITEMS);

  const monthsShort = t('projects.dashboard.monthsShort').split(',');
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
      className={dashboard.card}
      loading={loading}
    >
      {!loading && error ? (
        <Text type="secondary">{t('dashboard.upcomingSchedule.error')}</Text>
      ) : !loading && upcoming.length === 0 ? (
        <EmptyHint icon={<CalendarOutlined />} title={t('dashboard.upcomingSchedule.empty')} />
      ) : (
        <Flex vertical gap={10}>
          {upcoming.map((event) => {
            const start = dayjs(event.startDate);
            return (
              <Flex
                key={event.id}
                align="center"
                gap={12}
                className={styles.row}
                onClick={goToCalendar}
              >
                <Flex vertical align="center" justify="center" className={styles.dateBadge}>
                  <Text strong className={styles.dateNumber}>
                    {start.date()}
                  </Text>
                  <Text type="secondary" className={styles.dateMonth}>
                    {monthsShort[start.month()]}
                  </Text>
                </Flex>

                <Flex vertical gap={2} className={styles.info}>
                  <Text strong ellipsis>
                    {event.title?.trim() || event.project.name}
                  </Text>
                  <ScheduleDaysSummary days={event.days} />
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}
