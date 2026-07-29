import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { companyNeedsSetup, useCompany } from '@/entities/company';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import {
  createInvoice,
  deleteInvoice,
  invoicePdfUrl,
  invoiceQueries,
  type CreateInvoicePayload,
  type InvoiceDto,
} from '@/entities/invoice';
import { documentQueries } from '@/entities/document';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { InvoiceFormModal } from '../form/InvoiceFormModal';
import styles from './InvoicesPage.module.css';

const { Text } = Typography;

export function InvoicesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const {
    data: invoices = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(invoiceQueries.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { canAccess, isAdmin } = useWorkspaceAccess();
  const canEdit = canAccess('invoices', 'edit');

  const companyIncomplete = companyNeedsSetup(company) || !company.taxId;

  const handleAdd = () => setIsFormOpen(true);

  const handleCancelForm = () => setIsFormOpen(false);

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    setSubmitting(true);
    try {
      await createInvoice(payload);
      void message.success(t('invoices.form.created'));
      setIsFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: invoiceQueries.all });
      await queryClient.invalidateQueries({ queryKey: documentQueries.all });
    } catch {
      void message.error(t('invoices.form.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (invoice: InvoiceDto) => {
    setDeletingId(invoice.id);
    try {
      await deleteInvoice(invoice.id);
      void message.success(t('invoices.deleted'));
      await queryClient.invalidateQueries({ queryKey: invoiceQueries.all });
      await queryClient.invalidateQueries({ queryKey: documentQueries.all });
    } catch {
      void message.error(t('invoices.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<InvoiceDto> = [
    {
      title: t('invoices.columns.number'),
      dataIndex: 'fullNumber',
      key: 'fullNumber',
      render: (fullNumber: string, record) => (
        <Flex align="center" gap={6}>
          <Text>{fullNumber}</Text>
          {record.documentId === null && (
            <SemanticTag tone="pending">{t('invoices.noLedgerEntry')}</SemanticTag>
          )}
        </Flex>
      ),
    },
    {
      title: t('invoices.columns.issueDate'),
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
      render: (issueDate: string) => <Numeric>{issueDate}</Numeric>,
    },
    {
      title: t('invoices.columns.customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: t('invoices.columns.taxBase'),
      dataIndex: 'taxBase',
      key: 'taxBase',
      width: 140,
      align: 'right',
      render: (taxBase: number, record) => <Amount value={taxBase} currency={record.currency} />,
    },
    {
      title: t('invoices.columns.total'),
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (total: number, record) => <Amount value={total} currency={record.currency} />,
    },
    {
      title: t('invoices.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Flex gap={4} justify="center">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            aria-label={t('invoices.actions.downloadPdf')}
            disabled={!record.hasPdf}
            onClick={() => window.open(invoicePdfUrl(record.id), '_blank', 'noopener,noreferrer')}
          />
          {canEdit && <Popconfirm
            title={t('invoices.deleteConfirm.title')}
            description={t('invoices.deleteConfirm.content', { number: record.fullNumber })}
            okText={t('invoices.deleteConfirm.ok')}
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
        </Flex>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={canEdit ? <Tooltip title={companyIncomplete ? t('invoices.companyIncomplete') : undefined}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={companyIncomplete}
              onClick={handleAdd}
            >
              {t('invoices.add')}
            </Button>
          </Tooltip> : undefined}
      />

      {companyIncomplete && isAdmin && (
        <Alert
          type="warning"
          showIcon
          message={t('invoices.companyIncomplete')}
          action={
            <Button
              size="small"
              onClick={() => void navigate({ to: '/workspace', search: { tab: 'company' } })}
            >
              {t('company.settings.title')}
            </Button>
          }
          className={styles.incompleteAlert}
        />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('invoices.loadError')} />
      ) : invoices.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('invoices.empty')}>
          {canEdit && <Tooltip title={companyIncomplete ? t('invoices.companyIncomplete') : undefined}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={companyIncomplete}
              onClick={handleAdd}
            >
              {t('invoices.add')}
            </Button>
          </Tooltip>}
        </Empty>
      ) : (
        <Table<InvoiceDto>
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          pagination={false}
        />
      )}

      <InvoiceFormModal
        open={isFormOpen}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}
