import { useQuery } from '@tanstack/react-query';
import { Table, type TableColumnsType } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { documentQueries, STATUS_TONE, type DocumentListItemDto } from '@/entities/document';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { AddStaffDocumentButton } from '../addDocument/AddStaffDocumentButton';
import type { StaffSectionProps } from '../../model/types';
import shared from '../staff-detail.module.css';

export function PayrollsSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const { data: payrolls = [], isPending: loading } = useQuery(
    documentQueries.list({ staffMemberId: staffMember.id }),
  );

  const columns: TableColumnsType<DocumentListItemDto> = [
    {
      title: t('staff.payrolls.columns.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: t('staff.payrolls.columns.project'),
      dataIndex: 'projectName',
      key: 'projectName',
    },
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

  return (
    <PageContainer>
      <div className={shared.actionsBar}>
        <AddStaffDocumentButton staffMemberId={staffMember.id} />
      </div>

      {!loading && payrolls.length === 0 ? (
        <EmptyHint icon={<FileDoneOutlined />} title={t('staff.payrolls.empty')} />
      ) : (
        <Table<DocumentListItemDto>
          columns={columns}
          dataSource={payrolls}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      )}
    </PageContainer>
  );
}
