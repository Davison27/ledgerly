import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Avatar, Button, Flex, Spin, Typography } from 'antd';
import { CalendarOutlined, ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { listScheduleEvents, ScheduleDaysSummary, type ScheduleEventDto } from '@/entities/schedule-event';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import type { StaffSectionProps } from '../model/types';

const { Text } = Typography;

interface ProjectAgendaGroup {
  projectId: string;
  projectName: string;
  projectImage: string | null;
  events: ScheduleEventDto[];
}

function groupByProject(events: ScheduleEventDto[]): ProjectAgendaGroup[] {
  const groups = new Map<string, ProjectAgendaGroup>();

  for (const event of [...events].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const existing = groups.get(event.projectId);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(event.projectId, {
        projectId: event.projectId,
        projectName: event.project.name,
        projectImage: event.project.image,
        events: [event],
      });
    }
  }

  return Array.from(groups.values());
}

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

  const groups = useMemo(() => groupByProject(events), [events]);

  return (
    <PageContainer>
      <Flex justify="flex-end" style={{ marginBottom: 12 }}>
        <Button icon={<CalendarOutlined />} onClick={() => void navigate({ to: '/calendar' })}>
          {t('staff.schedule.viewInCalendar')}
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('staff.schedule.loadError')} />
      ) : groups.length === 0 ? (
        <EmptyHint icon={<CalendarOutlined />} title={t('staff.schedule.empty')} />
      ) : (
        <Flex vertical gap={20}>
          {groups.map((group) => (
            <Flex key={group.projectId} vertical gap={8}>
              <Flex align="center" gap={8}>
                {group.projectImage ? (
                  <Avatar shape="square" size={22} src={group.projectImage} />
                ) : (
                  <Avatar shape="square" size={22} icon={<ProjectOutlined />} />
                )}
                <Text strong>{group.projectName}</Text>
              </Flex>
              <Flex vertical gap={6} style={{ paddingInlineStart: 30 }}>
                {group.events.map((event) => (
                  <Flex key={event.id} vertical gap={2}>
                    <ScheduleDaysSummary days={event.days} />
                    {event.title && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {event.title}
                      </Text>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </PageContainer>
  );
}
