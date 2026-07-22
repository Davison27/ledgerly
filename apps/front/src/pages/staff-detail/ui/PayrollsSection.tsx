import { useCallback, useEffect, useState } from 'react';
import { Table, type TableColumnsType } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { listAllDocuments, STATUS_TONE, type DocumentListItemDto } from '@/entities/document';
import { listStaffDocumentTypes, type StaffDocumentTypeDto } from '@/entities/staff-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { AddStaffDocumentButton } from './AddStaffDocumentButton';
import type { StaffSectionProps } from '../model/types';

export function PayrollsSection({ staffMember, onDocumentsChanged }: StaffSectionProps) {
  const { t } = useTranslation();
  const [payrolls, setPayrolls] = useState<DocumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<StaffDocumentTypeDto[]>([]);

  const loadPayrolls = useCallback(() => {
    setLoading(true);
    listAllDocuments({ staffMemberId: staffMember.id })
      .then(setPayrolls)
      .catch(() => setPayrolls([]))
      .finally(() => setLoading(false));
  }, [staffMember.id]);

  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    listStaffDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => setDocumentTypes([]));
  }, []);

  const handleCreated = () => {
    loadPayrolls();
    onDocumentsChanged();
  };

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <AddStaffDocumentButton
          staffMemberId={staffMember.id}
          documentTypes={documentTypes}
          onCreated={handleCreated}
        />
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
