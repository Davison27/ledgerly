import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Flex, Skeleton, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { scheduleQueries } from '@/entities/schedule-event';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import typography from '@/shared/ui/typography.module.css';
import { agendaStats, groupAgenda, type AgendaStatus } from '../../model/agenda';
import type { StaffSectionProps } from '../../model/types';
import { AgendaEventCard } from '../eventCard/AgendaEventCard';
import styles from './AgendaSection.module.css';
import shared from '../staff-detail.module.css';

const { Text } = Typography;

const SECTION_TITLE_KEY: Record<AgendaStatus, string> = {
  current: 'staff.schedule.sections.current',
  upcoming: 'staff.schedule.sections.upcoming',
  past: 'staff.schedule.sections.past',
};

export function AgendaSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: events = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(scheduleQueries.events({ staffMemberId: staffMember.id }));

  const goToCalendar = () => void navigate({ to: '/calendar' });
  const goToProject = (projectId: string) =>
    void navigate({ to: '/projects/$projectId', params: { projectId } });

  const today = dayjs().format('YYYY-MM-DD');
  const groups = useMemo(() => groupAgenda(events, today), [events, today]);
  const stats = useMemo(() => agendaStats(events), [events]);

  return (
    <PageContainer>
      <Flex className={shared.actionsBar}>
        <Button icon={<CalendarOutlined />} onClick={goToCalendar}>
          {t('staff.schedule.viewInCalendar')}
        </Button>
      </Flex>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('staff.schedule.loadError')} />
      ) : events.length === 0 ? (
        <EmptyHint
          icon={<CalendarOutlined />}
          title={t('staff.schedule.empty')}
          action={
            <Button icon={<CalendarOutlined />} onClick={goToCalendar}>
              {t('staff.schedule.viewInCalendar')}
            </Button>
          }
        />
      ) : (
        <Flex vertical gap={28}>
          <Flex gap={32}>
            <Flex vertical gap={2}>
              <div className={typography.kpiValueSm}>{stats.blocks}</div>
              <Text className={typography.kpiLabel} type="secondary">
                {t('staff.schedule.stats.blocks')}
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <div className={typography.kpiValueSm}>{stats.days}</div>
              <Text className={typography.kpiLabel} type="secondary">
                {t('staff.schedule.stats.days')}
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <div className={typography.kpiValueSm}>{stats.projects}</div>
              <Text className={typography.kpiLabel} type="secondary">
                {t('staff.schedule.stats.projects')}
              </Text>
            </Flex>
          </Flex>

          {groups.map((group) => (
            <Flex key={group.status} vertical gap={12}>
              <Text className={typography.kpiLabel} type="secondary">
                {t(SECTION_TITLE_KEY[group.status])}
              </Text>
              <div className={styles.grid}>
                {group.events.map((event) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    status={group.status}
                    staffMemberId={staffMember.id}
                    onOpenProject={goToProject}
                  />
                ))}
              </div>
            </Flex>
          ))}
        </Flex>
      )}
    </PageContainer>
  );
}
