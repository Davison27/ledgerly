import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Steps,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { createDocument, extractInvoice } from '../../../../data/api/documents.api';
import { ApiError } from '../../../../data/api/httpClient';
import { createSupplier, listSuppliers } from '../../../../data/api/suppliers.api';
import type {
  CreateDocumentPayload,
  DocumentStatusDto,
  DocumentTypeDto,
  ExtractInvoiceConfidence,
  ExtractInvoiceResult,
  SupplierDto,
} from '../../../../data/api/types';

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function findMatchingSupplier(
  suppliers: SupplierDto[],
  taxId: string | null | undefined,
  name: string | null | undefined,
): SupplierDto | undefined {
  const normalizedTaxId = normalize(taxId);
  if (normalizedTaxId) {
    const byTaxId = suppliers.find((supplier) => normalize(supplier.taxId) === normalizedTaxId);
    if (byTaxId) return byTaxId;
  }
  const normalizedName = normalize(name);
  if (normalizedName) {
    return suppliers.find((supplier) => normalize(supplier.name) === normalizedName);
  }
  return undefined;
}

const { Dragger } = Upload;
const { Text } = Typography;

interface DocumentUploadModalProps {
  open: boolean;
  projectId: string;
  onCancel: () => void;
  onCreated: () => void;
}

interface DocumentFormFields {
  name: string;
  type: DocumentTypeDto;
  status: DocumentStatusDto;
  date: dayjs.Dayjs;
  dueDate?: dayjs.Dayjs;
  amount: number;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  currency?: string;
  invoiceNumber?: string;
  issuerName?: string;
  issuerTaxId?: string;
}

type FlowStep = 'idle' | 'uploading' | 'processing' | 'done';

const DOCUMENT_TYPES: DocumentTypeDto[] = ['factura', 'nomina', 'impuesto'];
const DOCUMENT_STATUSES: DocumentStatusDto[] = ['pagado', 'pendiente', 'vencido'];
const CURRENCIES = ['EUR', 'USD', 'GBP'];

const CONFIDENCE_COLOR: Record<ExtractInvoiceConfidence, string> = {
  high: 'success',
  partial: 'warning',
  low: 'error',
};

export function DocumentUploadModal({
  open,
  projectId,
  onCancel,
  onCreated,
}: DocumentUploadModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<DocumentFormFields>();

  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<FlowStep>('idle');
  const [progress, setProgress] = useState(0);
  const [extractResult, setExtractResult] = useState<ExtractInvoiceResult | null>(null);
  const [scannedPdfError, setScannedPdfError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const extractionTokenRef = useRef(0);

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [autoMatchAttempted, setAutoMatchAttempted] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierTaxId, setNewSupplierTaxId] = useState('');
  const [creatingSupplierSubmitting, setCreatingSupplierSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileName(null);
      setSelectedFile(null);
      setStep('idle');
      setProgress(0);
      setExtractResult(null);
      setScannedPdfError(false);
      setSubmitting(false);
      extractionTokenRef.current += 1;

      setSuppliers([]);
      setSuppliersLoaded(false);
      setSupplierId(null);
      setAutoMatchAttempted(false);
      setCreatingSupplier(false);
      setNewSupplierName('');
      setNewSupplierTaxId('');

      listSuppliers()
        .then(setSuppliers)
        .catch(() => setSuppliers([]))
        .finally(() => setSuppliersLoaded(true));
    }
  }, [open, form]);

  // Once both the extraction result and the supplier list are available, try to
  // preselect a supplier matching the extracted issuer (by tax ID, then by name).
  useEffect(() => {
    if (!extractResult || autoMatchAttempted || !suppliersLoaded) return;
    const match = findMatchingSupplier(
      suppliers,
      extractResult.fields.issuerTaxId,
      extractResult.fields.issuerName,
    );
    if (match) {
      setSupplierId(match.id);
    }
    setAutoMatchAttempted(true);
  }, [extractResult, suppliers, suppliersLoaded, autoMatchAttempted]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleFileSelected = (selected: RcFile): boolean => {
    const token = ++extractionTokenRef.current;
    setFileName(selected.name);
    setSelectedFile(selected);
    setExtractResult(null);
    setScannedPdfError(false);
    setStep('uploading');
    setProgress(0);
    setAutoMatchAttempted(false);

    const onProgress = (percent: number) => {
      if (extractionTokenRef.current !== token) return;
      setProgress(percent);
      if (percent >= 100) setStep('processing');
    };

    extractInvoice(projectId, selected, onProgress)
      .then((result) => {
        if (extractionTokenRef.current !== token) return;
        setExtractResult(result);
        setStep('done');
        form.setFieldsValue({
          name: result.fields.name,
          type: result.fields.type ?? 'factura',
          date: result.fields.date ? dayjs(result.fields.date) : undefined,
          dueDate: result.fields.dueDate ? dayjs(result.fields.dueDate) : undefined,
          amount: result.fields.amount,
          taxBase: result.fields.taxBase,
          taxRate: result.fields.taxRate,
          taxAmount: result.fields.taxAmount,
          currency: result.fields.currency ?? 'EUR',
          invoiceNumber: result.fields.invoiceNumber,
          issuerName: result.fields.issuerName,
          issuerTaxId: result.fields.issuerTaxId,
        });
      })
      .catch((error: unknown) => {
        if (extractionTokenRef.current !== token) return;
        setStep('idle');
        setProgress(0);
        if (error instanceof ApiError && error.status === 422) {
          setScannedPdfError(true);
          return;
        }
        void message.error(t('projects.documents.upload.extractError'));
      });

    return false;
  };

  const handleSelectSupplier = (value: string | undefined) => {
    setSupplierId(value ?? null);
    if (!value) return;
    const supplier = suppliers.find((candidate) => candidate.id === value);
    if (supplier) {
      form.setFieldsValue({
        issuerName: supplier.name,
        issuerTaxId: supplier.taxId ?? undefined,
      });
    }
  };

  const handleOpenCreateSupplier = () => {
    setNewSupplierName(form.getFieldValue('issuerName') ?? '');
    setNewSupplierTaxId(form.getFieldValue('issuerTaxId') ?? '');
    setCreatingSupplier(true);
  };

  const handleCancelCreateSupplier = () => {
    setCreatingSupplier(false);
    setNewSupplierName('');
    setNewSupplierTaxId('');
  };

  const handleCreateSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      void message.warning(t('projects.documents.upload.supplier.createNameRequired'));
      return;
    }

    setCreatingSupplierSubmitting(true);
    try {
      const created = await createSupplier({
        name,
        taxId: newSupplierTaxId.trim() || undefined,
      });
      setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(created.id);
      form.setFieldsValue({
        issuerName: created.name,
        issuerTaxId: created.taxId ?? undefined,
      });
      handleCancelCreateSupplier();
      void message.success(t('projects.documents.upload.supplier.created'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('projects.documents.upload.supplier.duplicateTaxId'));
      } else {
        void message.error(t('projects.documents.upload.supplier.createError'));
      }
    } finally {
      setCreatingSupplierSubmitting(false);
    }
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const { date, dueDate, ...rest } = values;
        const payload: CreateDocumentPayload = {
          ...rest,
          date: date.format('YYYY-MM-DD'),
          dueDate: dueDate ? dueDate.format('YYYY-MM-DD') : undefined,
          month: date.month() + 1,
          supplierId: supplierId ?? undefined,
        };

        setSubmitting(true);

        createDocument(projectId, payload, selectedFile ?? undefined)
          .then(() => {
            void message.success(t('projects.documents.upload.created'));
            form.resetFields();
            onCreated();
          })
          .catch(() => {
            void message.error(t('projects.documents.upload.extractError'));
          })
          .finally(() => setSubmitting(false));
      })
      .catch(() => {
        // validation errors are shown inline by antd
      });
  };

  const stepsCurrent = step === 'uploading' ? 0 : step === 'processing' ? 1 : step === 'done' ? 2 : -1;
  const progressPercent = step === 'uploading' ? progress : step === 'idle' ? 0 : 100;
  const progressStatus = step === 'done' ? 'success' : step === 'processing' ? 'active' : 'normal';
  const showReviewNote =
    extractResult && (extractResult.confidence === 'low' || extractResult.confidence === 'partial');

  return (
    <Modal
      open={open}
      title={t('projects.documents.upload.title')}
      okText={t('projects.documents.upload.submit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(1080px, 95vw)"
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto', paddingTop: 4 } }}
    >
      <Dragger
        accept="application/pdf"
        multiple={false}
        maxCount={1}
        showUploadList={false}
        disabled={step === 'uploading' || step === 'processing'}
        beforeUpload={handleFileSelected}
        style={{ marginBottom: 12 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('projects.documents.upload.dropzone.title')}</p>
        <p className="ant-upload-hint">{t('projects.documents.upload.dropzone.hint')}</p>
      </Dragger>

      {fileName && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {t('projects.documents.upload.dropzone.selectedFile', { name: fileName })}
        </Text>
      )}

      {step !== 'idle' && (
        <Flex vertical gap={4} style={{ marginBottom: 16 }}>
          <Steps
            size="small"
            current={stepsCurrent}
            items={[
              { title: t('projects.documents.upload.steps.uploading') },
              { title: t('projects.documents.upload.steps.processing') },
              { title: t('projects.documents.upload.steps.done') },
            ]}
          />
          <Progress percent={progressPercent} status={progressStatus} />
        </Flex>
      )}

      {scannedPdfError && (
        <Alert
          type="warning"
          showIcon
          message={t('projects.documents.upload.scannedPdfAlert')}
          style={{ marginBottom: 16 }}
        />
      )}

      {extractResult && (
        <Flex vertical gap={8} style={{ marginBottom: 16 }}>
          <Flex gap={8} wrap align="center">
            <Tag>{t(`projects.documents.upload.extraction.source.${extractResult.source}`)}</Tag>
            <Tag color={CONFIDENCE_COLOR[extractResult.confidence]}>
              {t(`projects.documents.upload.extraction.confidence.${extractResult.confidence}`)}
            </Tag>
          </Flex>
          {showReviewNote && (
            <Alert type="info" showIcon message={t('projects.documents.upload.extraction.reviewNote')} />
          )}
          {extractResult.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={t('projects.documents.upload.extraction.warningsTitle')}
              description={
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {extractResult.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              }
            />
          )}
        </Flex>
      )}

      <Form<DocumentFormFields>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ type: 'factura', status: 'pendiente', currency: 'EUR' }}
      >
        <Text strong>{t('projects.documents.upload.sections.document')}</Text>
        <Divider style={{ marginTop: 6, marginBottom: 12 }} />
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="name"
              label={t('projects.documents.upload.fields.name')}
              style={{ marginBottom: 12 }}
              rules={[
                { required: true, message: t('projects.documents.upload.validation.nameRequired') },
              ]}
            >
              <Input placeholder={t('projects.documents.upload.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="type"
              label={t('projects.documents.upload.fields.type')}
              style={{ marginBottom: 12 }}
            >
              <Select
                options={DOCUMENT_TYPES.map((type) => ({
                  value: type,
                  label: t(`projects.documents.types.${type}`),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="status"
              label={t('projects.documents.upload.fields.status')}
              style={{ marginBottom: 12 }}
            >
              <Select
                options={DOCUMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`projects.documents.statuses.${status}`),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="date"
              label={t('projects.documents.upload.fields.date')}
              style={{ marginBottom: 12 }}
              rules={[
                { required: true, message: t('projects.documents.upload.validation.dateRequired') },
              ]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="dueDate"
              label={t('projects.documents.upload.fields.dueDate')}
              style={{ marginBottom: 12 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="invoiceNumber"
              label={t('projects.documents.upload.fields.invoiceNumber')}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder={t('projects.documents.upload.placeholders.invoiceNumber')} />
            </Form.Item>
          </Col>
        </Row>

        <Text strong>{t('projects.documents.upload.sections.supplier')}</Text>
        <Divider style={{ marginTop: 6, marginBottom: 12 }} />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('projects.documents.upload.supplier.label')}
              style={{ marginBottom: creatingSupplier ? 8 : 12 }}
            >
              <Select
                showSearch
                allowClear
                value={supplierId ?? undefined}
                onChange={handleSelectSupplier}
                onClear={() => handleSelectSupplier(undefined)}
                placeholder={t('projects.documents.upload.supplier.placeholder')}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.taxId ? `${supplier.name} (${supplier.taxId})` : supplier.name,
                }))}
              />
            </Form.Item>
            {creatingSupplier ? (
              <Flex gap={8} wrap style={{ marginBottom: 12 }}>
                <Input
                  style={{ flex: '1 1 160px' }}
                  placeholder={t('projects.documents.upload.supplier.createNamePlaceholder')}
                  value={newSupplierName}
                  onChange={(event) => setNewSupplierName(event.target.value)}
                />
                <Input
                  style={{ flex: '1 1 140px' }}
                  placeholder={t('projects.documents.upload.supplier.createTaxIdPlaceholder')}
                  value={newSupplierTaxId}
                  onChange={(event) => setNewSupplierTaxId(event.target.value)}
                />
                <Button
                  type="primary"
                  loading={creatingSupplierSubmitting}
                  onClick={() => void handleCreateSupplier()}
                >
                  {t('projects.documents.upload.supplier.createSubmit')}
                </Button>
                <Button onClick={handleCancelCreateSupplier}>{t('common.cancel')}</Button>
              </Flex>
            ) : (
              <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ paddingInlineStart: 0, marginBottom: 12 }}
                onClick={handleOpenCreateSupplier}
              >
                {t('projects.documents.upload.supplier.createNew')}
              </Button>
            )}
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="issuerName"
                  label={t('projects.documents.upload.fields.issuerName')}
                  style={{ marginBottom: 4 }}
                >
                  <Input
                    disabled={Boolean(supplierId)}
                    placeholder={t('projects.documents.upload.placeholders.issuerName')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="issuerTaxId"
                  label={t('projects.documents.upload.fields.issuerTaxId')}
                  style={{ marginBottom: 4 }}
                >
                  <Input
                    disabled={Boolean(supplierId)}
                    placeholder={t('projects.documents.upload.placeholders.issuerTaxId')}
                  />
                </Form.Item>
              </Col>
            </Row>
            {supplierId && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('projects.documents.upload.supplier.autofillNote')}
              </Text>
            )}
          </Col>
        </Row>

        <Text strong>{t('projects.documents.upload.sections.amounts')}</Text>
        <Divider style={{ marginTop: 6, marginBottom: 12 }} />
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="amount"
              label={t('projects.documents.upload.fields.amount')}
              style={{ marginBottom: 12 }}
              rules={[
                { required: true, message: t('projects.documents.upload.validation.amountRequired') },
                { type: 'number', min: 0, message: t('projects.documents.upload.validation.amountMin') },
              ]}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="currency"
              label={t('projects.documents.upload.fields.currency')}
              style={{ marginBottom: 12 }}
            >
              <Select
                options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="taxBase"
              label={t('projects.documents.upload.fields.taxBase')}
              style={{ marginBottom: 12 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="taxRate"
              label={t('projects.documents.upload.fields.taxRate')}
              style={{ marginBottom: 12 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="taxAmount"
              label={t('projects.documents.upload.fields.taxAmount')}
              style={{ marginBottom: 0 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
