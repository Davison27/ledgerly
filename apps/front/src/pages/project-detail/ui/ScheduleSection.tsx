import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Flex, Skeleton, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { listScheduleEvents, ScheduleDaysSummary, type ScheduleEventDto } from '@/entities/schedule-event';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import type { ProjectSectionProps } from '../model/types';

const { Text } = Typography;

export function ScheduleSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadEvents = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listScheduleEvents({ projectId: project.id })
      .then(setEvents)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [project.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const columns: TableColumnsType<ScheduleEventDto> = [
    {
      title: t('projects.schedule.columns.days'),
      key: 'days',
      render: (_, record) => <ScheduleDaysSummary days={record.days} />,
    },
    {
      title: t('projects.schedule.columns.staff'),
      key: 'staff',
      render: (_, record) =>
        record.staff.length === 0 ? (
          <Text type="secondary">{t('projects.schedule.noStaff')}</Text>
        ) : (
          <Flex gap={4} wrap>
            {record.staff.map((staffMember) => (
              <Tag key={staffMember.id}>
                {staffMember.firstName} {staffMember.lastName}
              </Tag>
            ))}
          </Flex>
        ),
    },
    {
      title: t('projects.schedule.columns.products'),
      key: 'products',
      render: (_, record) =>
        record.products.length === 0 ? (
          <Text type="secondary">{t('projects.schedule.noProducts')}</Text>
        ) : (
          <Flex gap={4} wrap>
            {record.products.map((product) => (
              <Tag key={product.productId} color="blue">
                {product.name} ×{product.quantity}
              </Tag>
            ))}
          </Flex>
        ),
    },
  ];

  return (
    <PageContainer>
      <Flex justify="flex-end" style={{ marginBottom: 12 }}>
        <Button icon={<CalendarOutlined />} onClick={() => void navigate({ to: '/calendar' })}>
          {t('projects.schedule.viewInCalendar')}
        </Button>
      </Flex>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('projects.schedule.loadError')} />
      ) : events.length === 0 ? (
        <EmptyHint icon={<CalendarOutlined />} title={t('projects.schedule.empty')} />
      ) : (
        <Table<ScheduleEventDto>
          columns={columns}
          dataSource={events}
          rowKey="id"
          pagination={false}
        />
      )}
    </PageContainer>
  );
}
