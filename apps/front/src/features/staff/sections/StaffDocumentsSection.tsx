import { useCallback, useEffect, useState } from 'react';
import { App, Button, Popconfirm, Table, Tabs, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  deleteStaffDocument,
  listStaffDocumentTypes,
  listStaffDocuments,
  staffDocumentFileUrl,
} from '../../../data/api/staff.api';
import type { StaffDocumentDto, StaffDocumentTypeDto } from '../../../data/api/types';
import { PageContainer } from '../../../components/ui/PageContainer';
import { EmptyHint } from '../../../components/ui/EmptyHint';
import { Numeric } from '../../../components/ui/Numeric';
import { SemanticTag } from '../../../components/ui/SemanticTag';
import { AddStaffDocumentButton } from '../components/AddStaffDocumentButton';
import { StaffDocumentEditModal } from '../components/StaffDocumentEditModal';
import { getExpiryStatus, getExpiryTone } from './staffDocumentStatus';
import type { StaffSectionProps } from './types';

/** D2: payrolls aren't part of this catalogue, but the filter is kept
 * defensive in case a future seed ever added one under this code. */
const PAYROLL_TYPE_CODE = 'nomina';

export function StaffDocumentsSection({
  staffMember,
  onDocumentsChanged,
}: StaffSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [documentTypes, setDocumentTypes] = useState<StaffDocumentTypeDto[]>([]);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<StaffDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<StaffDocumentDto | null>(null);

  useEffect(() => {
    listStaffDocumentTypes()
      .then((types) => {
        const catalogue = types.filter((type) => type.code !== PAYROLL_TYPE_CODE);
        setDocumentTypes(catalogue);
        setActiveTypeId(catalogue[0]?.id ?? null);
      })
      .catch(() => setDocumentTypes([]))
      .finally(() => setTypesLoaded(true));
  }, []);

  const loadDocuments = useCallback(() => {
    if (!activeTypeId) return;
    setLoading(true);
    listStaffDocuments(staffMember.id, activeTypeId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [staffMember.id, activeTypeId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreated = () => {
    loadDocuments();
    onDocumentsChanged();
  };

  const handleUpdated = () => {
    setEditingDocument(null);
    loadDocuments();
    onDocumentsChanged();
  };

  const handleDelete = async (document: StaffDocumentDto) => {
    setDeletingId(document.id);
    try {
      await deleteStaffDocument(staffMember.id, document.id);
      void message.success(t('staff.documents.deleted'));
      loadDocuments();
      onDocumentsChanged();
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
      render: (_, record) => (
        <SemanticTag tone={getExpiryTone(record.expiryDate)}>
          {t(`staff.expiry.${getExpiryStatus(record.expiryDate)}`)}
        </SemanticTag>
      ),
    },
    {
      title: t('staff.documents.columns.actions'),
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <>
          <Button
            type="text"
            icon={<EyeOutlined />}
            aria-label={t('staff.documents.actions.view')}
            onClick={() => window.open(staffDocumentFileUrl(staffMember.id, record.id), '_blank')}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={t('common.edit')}
            onClick={() => setEditingDocument(record)}
          />
          <Popconfirm
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
          </Popconfirm>
        </>
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

      {typesLoaded && documentTypes.length === 0 ? (
        <EmptyHint icon={<FileTextOutlined />} title={t('staff.documents.noTypes')} />
      ) : (
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
      )}

      <StaffDocumentEditModal
        open={editingDocument !== null}
        staffMemberId={staffMember.id}
        document={editingDocument}
        documentTypes={documentTypes}
        onCancel={() => setEditingDocument(null)}
        onUpdated={handleUpdated}
      />
    </PageContainer>
  );
}
