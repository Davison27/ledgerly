import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../../app/providers/CompanyProvider';
import { companyNeedsSetup } from '../../data/company';
import {
  createInvoice,
  deleteInvoice,
  invoicePdfUrl,
  listInvoices,
} from '../../data/api/invoices.api';
import type { CreateInvoicePayload, InvoiceDto } from '../../data/api/types';
import { CompanySettingsModal } from '../../components/layout/CompanySettingsModal';
import { InvoiceFormModal } from './components/InvoiceFormModal';

const { Title, Text } = Typography;

function formatAmount(amount: number, currency: string): string {
  return amount.toLocaleString('es-ES', { style: 'currency', currency });
}

export function InvoicesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false);

  // D8: emitting with an incomplete company (no name or no taxId) returns a 400.
  // `companyNeedsSetup` only checks `!company.id`, so `taxId` needs its own check.
  const companyIncomplete = companyNeedsSetup(company) || !company.taxId;

  const loadInvoices = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listInvoices()
      .then(setInvoices)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleAdd = () => setIsFormOpen(true);

  const handleCancelForm = () => setIsFormOpen(false);

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    setSubmitting(true);
    try {
      await createInvoice(payload);
      void message.success(t('invoices.form.created'));
      setIsFormOpen(false);
      loadInvoices();
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
      loadInvoices();
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
            <Tag color="warning">{t('invoices.noLedgerEntry')}</Tag>
          )}
        </Flex>
      ),
    },
    {
      title: t('invoices.columns.issueDate'),
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
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
      render: (taxBase: number, record) => formatAmount(taxBase, record.currency),
    },
    {
      title: t('invoices.columns.total'),
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (total: number, record) => formatAmount(total, record.currency),
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
          <Popconfirm
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
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('invoices.title')}
        </Title>
        <Tooltip title={companyIncomplete ? t('invoices.companyIncomplete') : undefined}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={companyIncomplete}
            onClick={handleAdd}
          >
            {t('invoices.add')}
          </Button>
        </Tooltip>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {t('invoices.subtitle')}
      </Text>

      {companyIncomplete && (
        <Alert
          type="warning"
          showIcon
          message={t('invoices.companyIncomplete')}
          action={
            <Button size="small" onClick={() => setCompanySettingsOpen(true)}>
              {t('company.settings.title')}
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('invoices.loadError')} />
      ) : invoices.length === 0 ? (
        <Empty description={t('invoices.empty')} />
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

      <CompanySettingsModal
        open={companySettingsOpen}
        onClose={() => setCompanySettingsOpen(false)}
      />
    </div>
  );
}
