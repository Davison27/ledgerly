import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popover,
  Progress,
  Row,
  Select,
  Tag,
  Typography,
  Upload,
  theme,
} from 'antd';
import { ExclamationCircleOutlined, InboxOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
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
const { useBreakpoint } = Grid;
const { useToken } = theme;

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

const FORM_ITEM_STYLE: React.CSSProperties = { marginBottom: 8 };

export function DocumentUploadModal({
  open,
  projectId,
  onCancel,
  onCreated,
}: DocumentUploadModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { token } = useToken();
  const screens = useBreakpoint();
  const isDesktop = screens.md ?? true;
  const [form] = Form.useForm<DocumentFormFields>();

  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
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

  // Build (and clean up) an object URL for the in-memory PDF so it can be
  // previewed in an iframe without any network round-trip.
  useEffect(() => {
    if (!selectedFile) {
      setPdfObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPdfObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

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

  const handleRemoveFile = () => {
    extractionTokenRef.current += 1;
    setFileName(null);
    setSelectedFile(null);
    setExtractResult(null);
    setScannedPdfError(false);
    setStep('idle');
    setProgress(0);
    setAutoMatchAttempted(false);
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

  const handleCreateSupplierPopoverOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      handleOpenCreateSupplier();
    } else {
      handleCancelCreateSupplier();
    }
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

  const isBusy = step === 'uploading' || step === 'processing';
  const progressPercent = step === 'uploading' ? progress : step === 'idle' ? 0 : 100;
  const progressStatus = step === 'done' ? 'success' : step === 'processing' ? 'active' : 'normal';
  const showReviewNote =
    extractResult && (extractResult.confidence === 'low' || extractResult.confidence === 'partial');

  const confidenceTag = extractResult && (
    <Tag color={CONFIDENCE_COLOR[extractResult.confidence]}>
      {extractResult.warnings.length > 0 && <ExclamationCircleOutlined style={{ marginInlineEnd: 4 }} />}
      {t(`projects.documents.upload.extraction.confidence.${extractResult.confidence}`)}
    </Tag>
  );

  const createSupplierPopoverContent = (
    <Flex vertical gap={8} style={{ width: 240 }}>
      <Input
        size="small"
        placeholder={t('projects.documents.upload.supplier.createNamePlaceholder')}
        value={newSupplierName}
        onChange={(event) => setNewSupplierName(event.target.value)}
      />
      <Input
        size="small"
        placeholder={t('projects.documents.upload.supplier.createTaxIdPlaceholder')}
        value={newSupplierTaxId}
        onChange={(event) => setNewSupplierTaxId(event.target.value)}
      />
      <Flex gap={8} justify="end">
        <Button size="small" onClick={handleCancelCreateSupplier}>
          {t('common.cancel')}
        </Button>
        <Button
          size="small"
          type="primary"
          loading={creatingSupplierSubmitting}
          onClick={() => void handleCreateSupplier()}
        >
          {t('projects.documents.upload.supplier.createSubmit')}
        </Button>
      </Flex>
    </Flex>
  );

  const leftPanelStyle: React.CSSProperties = isDesktop
    ? { flex: '0 0 45%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }
    : { flex: '1 1 auto', minHeight: 260, display: 'flex', flexDirection: 'column' };

  const rightPanelStyle: React.CSSProperties = isDesktop
    ? { flex: '1 1 55%', height: '100%', minHeight: 0, overflowY: 'auto', paddingRight: 4 }
    : { flex: '1 1 auto' };

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
      width={isDesktop ? 'min(1200px, 96vw)' : '96vw'}
      styles={{
        body: isDesktop
          ? { height: 'min(680px, 86vh)', overflow: 'hidden', paddingTop: 4 }
          : { maxHeight: '86vh', overflowY: 'auto', paddingTop: 4 },
      }}
    >
      <Flex
        gap={20}
        style={{ height: isDesktop ? '100%' : 'auto' }}
        vertical={!isDesktop}
      >
        <div style={leftPanelStyle}>
          {!selectedFile ? (
            <Dragger
              accept="application/pdf"
              multiple={false}
              maxCount={1}
              showUploadList={false}
              disabled={isBusy}
              beforeUpload={handleFileSelected}
              style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                <InboxOutlined />
              </p>
              <p className="ant-upload-text" style={{ marginBottom: 2 }}>
                {t('projects.documents.upload.dropzone.title')}
              </p>
              <p className="ant-upload-hint">{t('projects.documents.upload.dropzone.hint')}</p>
            </Dragger>
          ) : (
            <Flex vertical gap={8} style={{ flex: '1 1 auto', minHeight: 0 }}>
              <Flex justify="space-between" align="center" gap={8}>
                <Text ellipsis title={fileName ?? undefined} style={{ flex: '1 1 auto', minWidth: 0 }}>
                  {fileName}
                </Text>
                <Button size="small" icon={<SwapOutlined />} disabled={isBusy} onClick={handleRemoveFile}>
                  {t('projects.documents.upload.dropzone.changeFile')}
                </Button>
              </Flex>

              {isBusy && <Progress percent={progressPercent} status={progressStatus} size="small" />}

              {extractResult && (
                <Flex vertical gap={4}>
                  <Flex gap={6} wrap align="center">
                    <Tag>{t(`projects.documents.upload.extraction.source.${extractResult.source}`)}</Tag>
                    {extractResult.warnings.length > 0 ? (
                      <Popover
                        title={t('projects.documents.upload.extraction.warningsTitle')}
                        content={
                          <ul style={{ margin: 0, paddingInlineStart: 18, maxWidth: 280 }}>
                            {extractResult.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        }
                      >
                        <span style={{ cursor: 'pointer' }}>{confidenceTag}</span>
                      </Popover>
                    ) : (
                      confidenceTag
                    )}
                  </Flex>
                  {showReviewNote && (
                    <Text type="warning" style={{ fontSize: 12 }}>
                      {t('projects.documents.upload.extraction.reviewNote')}
                    </Text>
                  )}
                </Flex>
              )}

              {scannedPdfError && (
                <Alert
                  type="warning"
                  showIcon
                  message={t('projects.documents.upload.scannedPdfAlert')}
                  style={{ fontSize: 12 }}
                />
              )}

              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 160,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: token.borderRadiusLG,
                  overflow: 'hidden',
                  background: token.colorFillQuaternary,
                }}
              >
                {pdfObjectUrl && (
                  <iframe
                    src={pdfObjectUrl}
                    title={fileName ?? 'pdf-preview'}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                )}
              </div>
            </Flex>
          )}
        </div>

        <div style={rightPanelStyle}>
          <Form<DocumentFormFields>
            form={form}
            layout="vertical"
            size="small"
            requiredMark={false}
            initialValues={{ type: 'factura', status: 'pendiente', currency: 'EUR' }}
          >
            <Text strong style={{ fontSize: 13 }}>
              {t('projects.documents.upload.sections.document')}
            </Text>
            <Row gutter={12} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="name"
                  label={t('projects.documents.upload.fields.name')}
                  style={FORM_ITEM_STYLE}
                  rules={[
                    { required: true, message: t('projects.documents.upload.validation.nameRequired') },
                  ]}
                >
                  <Input placeholder={t('projects.documents.upload.placeholders.name')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="type" label={t('projects.documents.upload.fields.type')} style={FORM_ITEM_STYLE}>
                  <Select
                    options={DOCUMENT_TYPES.map((type) => ({
                      value: type,
                      label: t(`projects.documents.types.${type}`),
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="status"
                  label={t('projects.documents.upload.fields.status')}
                  style={FORM_ITEM_STYLE}
                >
                  <Select
                    options={DOCUMENT_STATUSES.map((status) => ({
                      value: status,
                      label: t(`projects.documents.statuses.${status}`),
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="date"
                  label={t('projects.documents.upload.fields.date')}
                  style={FORM_ITEM_STYLE}
                  rules={[
                    { required: true, message: t('projects.documents.upload.validation.dateRequired') },
                  ]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="dueDate"
                  label={t('projects.documents.upload.fields.dueDate')}
                  style={FORM_ITEM_STYLE}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="invoiceNumber"
                  label={t('projects.documents.upload.fields.invoiceNumber')}
                  style={FORM_ITEM_STYLE}
                >
                  <Input placeholder={t('projects.documents.upload.placeholders.invoiceNumber')} />
                </Form.Item>
              </Col>
            </Row>

            <Text strong style={{ fontSize: 13 }}>
              {t('projects.documents.upload.sections.supplier')}
            </Text>
            <Row gutter={12} style={{ marginTop: 8 }} align="top">
              <Col xs={24} md={8}>
                <Form.Item label={t('projects.documents.upload.supplier.label')} style={FORM_ITEM_STYLE}>
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
                <Popover
                  trigger="click"
                  open={creatingSupplier}
                  onOpenChange={handleCreateSupplierPopoverOpenChange}
                  placement="bottomLeft"
                  content={createSupplierPopoverContent}
                >
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    style={{ paddingInlineStart: 0, marginTop: -4 }}
                  >
                    {t('projects.documents.upload.supplier.createNew')}
                  </Button>
                </Popover>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="issuerName"
                  label={t('projects.documents.upload.fields.issuerName')}
                  style={FORM_ITEM_STYLE}
                >
                  <Input
                    disabled={Boolean(supplierId)}
                    placeholder={t('projects.documents.upload.placeholders.issuerName')}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="issuerTaxId"
                  label={t('projects.documents.upload.fields.issuerTaxId')}
                  style={FORM_ITEM_STYLE}
                >
                  <Input
                    disabled={Boolean(supplierId)}
                    placeholder={t('projects.documents.upload.placeholders.issuerTaxId')}
                  />
                </Form.Item>
                {supplierId && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('projects.documents.upload.supplier.autofillNote')}
                  </Text>
                )}
              </Col>
            </Row>

            <Text strong style={{ fontSize: 13 }}>
              {t('projects.documents.upload.sections.amounts')}
            </Text>
            <Row gutter={12} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="amount"
                  label={t('projects.documents.upload.fields.amount')}
                  style={FORM_ITEM_STYLE}
                  rules={[
                    { required: true, message: t('projects.documents.upload.validation.amountRequired') },
                    {
                      type: 'number',
                      min: 0,
                      message: t('projects.documents.upload.validation.amountMin'),
                    },
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="currency"
                  label={t('projects.documents.upload.fields.currency')}
                  style={FORM_ITEM_STYLE}
                >
                  <Select options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="taxBase"
                  label={t('projects.documents.upload.fields.taxBase')}
                  style={FORM_ITEM_STYLE}
                >
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="taxRate"
                  label={t('projects.documents.upload.fields.taxRate')}
                  style={FORM_ITEM_STYLE}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
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
        </div>
      </Flex>
    </Modal>
  );
}
