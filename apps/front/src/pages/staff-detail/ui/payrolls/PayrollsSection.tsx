import { useQuery } from '@tanstack/react-query';
import { Card, Flex, Table, Typography, type TableColumnsType } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { documentQueries, STATUS_TONE, type DocumentListItemDto } from '@/entities/document';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import type { StaffSectionProps } from '../../model/types';
import shared from '../staff-detail.module.css';

const { Title, Text } = Typography;

export function PayrollsSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const { canAccess } = useWorkspaceAccess();
  const canView = canAccess('staff', 'view') && canAccess('documents', 'view');
  const canViewProjects = canAccess('projects', 'view');
  const { data: payrolls = [], isPending: loading } = useQuery({
    ...documentQueries.list({ staffMemberId: staffMember.id, type: 'payroll' }),
    enabled: canView,
  });

  const columns: TableColumnsType<DocumentListItemDto> = [
    {
      title: t('staff.payrolls.columns.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    ...(canViewProjects ? [{
      title: t('staff.payrolls.columns.project'),
      dataIndex: 'projectName',
      key: 'projectName',
    }] : []),
    {
      title: t('staff.payrolls.columns.date'),
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (date: string) => <Numeric>{date}</Numeric>,
    },
    {
      title: t('staff.payrolls.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amount: number) => <Amount value={amount} tone="expense" />,
    },
    {
      title: t('staff.payrolls.columns.status'),
      key: 'status',
      width: 130,
      render: (_, record) => (
        <SemanticTag tone={STATUS_TONE[record.status]}>
          {t(`projects.documents.statuses.${record.status}`)}
        </SemanticTag>
      ),
    },
  ];

  if (!canView) return null;

  return (
    <section className={shared.section}>
      <Flex align="flex-start" justify="space-between" gap={16} className={shared.sectionHeader}>
        <div>
          <Title level={3} className={shared.title}>{t('staff.sections.payrolls')}</Title>
          <Text type="secondary">{t('staff.payrolls.subtitle')}</Text>
        </div>
      </Flex>

      {!loading && payrolls.length === 0 ? (
        <EmptyHint icon={<FileDoneOutlined />} title={t('staff.payrolls.empty')} />
      ) : (
        <Card className={shared.contentCard}>
          <Table<DocumentListItemDto>
            columns={columns}
            dataSource={payrolls}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </Card>
      )}
    </section>
  );
}
