import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { listScheduleEvents, type ScheduleEventDto } from '@/entities/schedule-event';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { TYPE } from '@/shared/config/theme';
import { agendaStats, groupAgenda, type AgendaStatus } from '../model/agenda';
import type { StaffSectionProps } from '../model/types';
import { AgendaEventCard } from './AgendaEventCard';

const { Text } = Typography;

const SECTION_TITLE_KEY: Record<AgendaStatus, string> = {
  current: 'staff.schedule.sections.current',
  upcoming: 'staff.schedule.sections.upcoming',
  past: 'staff.schedule.sections.past',
};

export function AgendaSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadEvents = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listScheduleEvents({ staffMemberId: staffMember.id })
      .then(setEvents)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [staffMember.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const goToCalendar = () => void navigate({ to: '/calendar' });
  const goToProject = (projectId: string) =>
    void navigate({ to: '/projects/$projectId', params: { projectId } });

  const today = dayjs().format('YYYY-MM-DD');
  const groups = useMemo(() => groupAgenda(events, today), [events, today]);
  const stats = useMemo(() => agendaStats(events), [events]);

  return (
    <PageContainer>
      <Flex justify="flex-end" style={{ marginBottom: 12 }}>
        <Button icon={<CalendarOutlined />} onClick={goToCalendar}>
          {t('staff.schedule.viewInCalendar')}
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
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
              <div style={TYPE.kpiValueSm}>{stats.blocks}</div>
              <Text style={{ ...TYPE.kpiLabel }} type="secondary">
                {t('staff.schedule.stats.blocks')}
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <div style={TYPE.kpiValueSm}>{stats.days}</div>
              <Text style={{ ...TYPE.kpiLabel }} type="secondary">
                {t('staff.schedule.stats.days')}
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <div style={TYPE.kpiValueSm}>{stats.projects}</div>
              <Text style={{ ...TYPE.kpiLabel }} type="secondary">
                {t('staff.schedule.stats.projects')}
              </Text>
            </Flex>
          </Flex>

          {groups.map((group) => (
            <Flex key={group.status} vertical gap={12}>
              <Text style={{ ...TYPE.kpiLabel }} type="secondary">
                {t(SECTION_TITLE_KEY[group.status])}
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
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
