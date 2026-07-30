import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Flex, Popconfirm, Table, Tabs, Typography, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  deleteStaffDocument,
  staffDocumentFileUrl,
  staffDocumentTypeQueries,
  staffQueries,
  type StaffDocumentDto,
} from '@/entities/staff-member';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { AddStaffDocumentButton } from '../addDocument/AddStaffDocumentButton';
import { StaffDocumentEditModal } from '../edit/StaffDocumentEditModal';
import { getExpiryStatus, getExpiryTone } from '../../model/staffDocumentStatus';
import type { StaffSectionProps } from '../../model/types';
import shared from '../staff-detail.module.css';

const { Title, Text } = Typography;

const PAYROLL_TYPE_CODE = 'nomina';

export function StaffDocumentsSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('staff', 'edit');

  const { data: allDocumentTypes = [], isPending: typesLoading } = useQuery(
    staffDocumentTypeQueries.list(),
  );
  const documentTypes = useMemo(
    () => allDocumentTypes.filter((type) => type.code !== PAYROLL_TYPE_CODE),
    [allDocumentTypes],
  );
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTypeId === null && documentTypes.length > 0) {
      setActiveTypeId(documentTypes[0].id);
    }
  }, [documentTypes, activeTypeId]);

  const { data: documents = [], isPending: loading } = useQuery({
    ...staffQueries.documents(staffMember.id, activeTypeId ?? undefined),
    enabled: Boolean(activeTypeId),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<StaffDocumentDto | null>(null);

  const handleDelete = async (document: StaffDocumentDto) => {
    setDeletingId(document.id);
    try {
      await deleteStaffDocument(staffMember.id, document.id);
      void message.success(t('staff.documents.deleted'));
      await queryClient.invalidateQueries({ queryKey: staffQueries.all });
    } catch {
      void message.error(t('staff.documents.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<StaffDocumentDto> = [
    {
      title: t('staff.documents.columns.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: t('staff.documents.columns.issueDate'),
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 130,
      render: (issueDate: string) => <Numeric>{issueDate}</Numeric>,
    },
    {
      title: t('staff.documents.columns.expiryDate'),
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
      render: (expiryDate: string | null) => (expiryDate ? <Numeric>{expiryDate}</Numeric> : '—'),
    },
    {
      title: t('staff.documents.columns.status'),
      key: 'status',
      width: 130,
      render: (_: unknown, record: StaffDocumentDto) => (
        <SemanticTag tone={getExpiryTone(record.expiryDate)}>
          {t(`staff.expiry.${getExpiryStatus(record.expiryDate)}`)}
        </SemanticTag>
      ),
    },
    {
      title: t('staff.documents.columns.actions'),
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, record: StaffDocumentDto) => (
        <>
          <Button
            type="text"
            icon={<EyeOutlined />}
            aria-label={t('staff.documents.actions.view')}
            onClick={() => window.open(staffDocumentFileUrl(staffMember.id, record.id), '_blank')}
          />
          {canEdit && <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={t('common.edit')}
            onClick={() => setEditingDocument(record)}
          />}
          {canEdit && <Popconfirm
            title={t('staff.documents.deleteConfirm.title')}
            description={t('staff.documents.deleteConfirm.content', { name: record.name })}
            okText={t('staff.documents.deleteConfirm.ok')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              aria-label={t('common.delete')}
              loading={deletingId === record.id}
            />
          </Popconfirm>}
        </>
      ),
    },
  ];

  return (
    <section className={shared.section}>
      <Flex align="flex-start" justify="space-between" gap={16} className={shared.sectionHeader}>
        <div>
          <Title level={3} className={shared.title}>{t('staff.sections.documents')}</Title>
          <Text type="secondary">{t('staff.documents.subtitle')}</Text>
        </div>
        <AddStaffDocumentButton
          staffMemberId={staffMember.id}
          mode="document"
        />
      </Flex>

      {!typesLoading && documentTypes.length === 0 ? (
        <EmptyHint icon={<FileTextOutlined />} title={t('staff.documents.noTypes')} />
      ) : (
        <Card className={shared.contentCard}>
          <Tabs
            activeKey={activeTypeId ?? undefined}
            onChange={setActiveTypeId}
            items={documentTypes.map((type) => ({
              key: type.id,
              label: t(`staff.documentTypes.${type.code}`, { defaultValue: type.name }),
              children: loading ? null : documents.length === 0 ? (
                <EmptyHint icon={<FileTextOutlined />} title={t('staff.documents.empty')} />
              ) : (
                <Table<StaffDocumentDto>
                  columns={columns}
                  dataSource={documents}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              ),
            }))}
          />
        </Card>
      )}

      <StaffDocumentEditModal
        open={editingDocument !== null}
        staffMemberId={staffMember.id}
        document={editingDocument}
        documentTypes={documentTypes}
        onCancel={() => setEditingDocument(null)}
        onUpdated={() => setEditingDocument(null)}
      />
    </section>
  );
}
