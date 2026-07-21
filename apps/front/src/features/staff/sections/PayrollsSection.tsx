import { useCallback, useEffect, useState } from 'react';
import { Table, type TableColumnsType } from 'antd';
import { FileDoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { listAllDocuments } from '../../../data/api/documents.api';
import { listStaffDocumentTypes } from '../../../data/api/staff.api';
import type { DocumentListItemDto, StaffDocumentTypeDto } from '../../../data/api/types';
import { PageContainer } from '../../../components/ui/PageContainer';
import { EmptyHint } from '../../../components/ui/EmptyHint';
import { Amount } from '../../../components/ui/Amount';
import { Numeric } from '../../../components/ui/Numeric';
import { SemanticTag } from '../../../components/ui/SemanticTag';
import { STATUS_TONE } from '../../projects/sections/documents/documentFormat';
import { AddStaffDocumentButton } from '../components/AddStaffDocumentButton';
import type { StaffSectionProps } from './types';

/**
 * D2: a payroll is a `documents` row with `staffMemberId` set — filtering the
 * global list this way gets `projectName` for free, with no extra join or
 * separate `staff_documents` model for payrolls (they aren't `staff_documents`).
 */
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
