import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Col,
  ConfigProvider,
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
  Segmented,
  Select,
  Typography,
  Upload,
  theme,
} from 'antd';
import {
  ExclamationCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  createDocument,
  documentQueries,
  extractInvoice,
  extractInvoiceStandalone,
  formatEUR,
  type CreateDocumentPayload,
  type DocumentDirectionDto,
  type DocumentStatusDto,
  type DocumentTypeDto,
  type DuplicateCheckParams,
  type ExtractInvoiceConfidence,
  type ExtractInvoiceResult,
} from '@/entities/document';
import { ApiError } from '@/shared/api/httpClient';
import { createStaffMember, staffQueries } from '@/entities/staff-member';
import { createSupplier, supplierQueries, type SupplierDto } from '@/entities/supplier';
import { projectQueries } from '@/entities/project';
import { SemanticTag, type SemanticTone } from '@/shared/ui/SemanticTag';
import { SPACE } from '@/shared/config/theme';

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

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

const { Dragger } = Upload;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const MAX_QUEUE_FILES = 20;

export type DocumentUploadContext =
  { kind: 'project'; projectId: string } | { kind: 'staffPayroll'; staffMemberId: string };

interface DocumentUploadModalProps {
  open: boolean;
  context: DocumentUploadContext;
  onCancel: () => void;
  onCreated: () => void;
}

interface DocumentFormFields {
  name: string;
  type: DocumentTypeDto;
  direction: DocumentDirectionDto;
  status: DocumentStatusDto;
  date: dayjs.Dayjs;
  dueDate?: dayjs.Dayjs;
  amount: number;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  currency?: string;
  invoiceNumber?: string;
  issuerName?: string;
  issuerTaxId?: string;
}

type FlowStep = 'idle' | 'uploading' | 'processing' | 'done';

const DOCUMENT_TYPES: DocumentTypeDto[] = ['factura', 'nomina', 'impuesto'];
const DOCUMENT_STATUSES: DocumentStatusDto[] = ['pagado', 'pendiente', 'vencido'];
const DOCUMENT_DIRECTIONS: DocumentDirectionDto[] = ['ingreso', 'gasto'];
const CURRENCIES = ['EUR', 'USD', 'GBP'];

const CONFIDENCE_TONE: Record<ExtractInvoiceConfidence, SemanticTone> = {
  high: 'income',
  partial: 'pending',
  low: 'overdue',
};

const AMOUNT_MISMATCH_TOLERANCE = 0.02;

const FORM_INITIAL_VALUES = {
  type: 'factura' as DocumentTypeDto,
  direction: 'gasto' as DocumentDirectionDto,
  status: 'pendiente' as DocumentStatusDto,
  currency: 'EUR',
};

export function DocumentUploadModal({
  open,
  context,
  onCancel,
  onCreated,
}: DocumentUploadModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { token } = useToken();
  const queryClient = useQueryClient();
  const { data: projectsData } = useQuery(projectQueries.list());
  const projects = projectsData ?? [];
  const screens = useBreakpoint();
  const isDesktop = screens.md ?? true;
  const [form] = Form.useForm<DocumentFormFields>();

  const lockedType: DocumentTypeDto | undefined =
    context.kind === 'staffPayroll' ? 'nomina' : undefined;
  const showProjectSelect = context.kind === 'staffPayroll';

  const [queue, setQueue] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentFile = queue[currentIndex] ?? null;
  const fileName = currentFile?.name ?? null;
  const isMultiQueue = queue.length > 1;
  const isLastInQueue = currentIndex >= queue.length - 1;

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>('idle');
  const [progress, setProgress] = useState(0);
  const [extractResult, setExtractResult] = useState<ExtractInvoiceResult | null>(null);
  const [scannedPdfError, setScannedPdfError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const extractionTokenRef = useRef(0);

  const [duplicateCheckParams, setDuplicateCheckParams] = useState<DuplicateCheckParams | null>(
    null,
  );

  const { data: suppliersData, isPending: suppliersPending } = useQuery({
    ...supplierQueries.list(),
    enabled: open,
  });
  const suppliers = useMemo(() => suppliersData ?? [], [suppliersData]);
  const suppliersLoaded = !suppliersPending;
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [autoMatchAttempted, setAutoMatchAttempted] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierTaxId, setNewSupplierTaxId] = useState('');
  const [creatingSupplierSubmitting, setCreatingSupplierSubmitting] = useState(false);

  const { data: staffMembersData } = useQuery({
    ...staffQueries.list(),
    enabled: open && context.kind === 'project',
  });
  const staffMembers = staffMembersData ?? [];
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [staffMemberError, setStaffMemberError] = useState(false);
  const [creatingStaffMember, setCreatingStaffMember] = useState(false);
  const [newStaffMemberFirstName, setNewStaffMemberFirstName] = useState('');
  const [newStaffMemberLastName, setNewStaffMemberLastName] = useState('');
  const [creatingStaffMemberSubmitting, setCreatingStaffMemberSubmitting] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState(false);

  const typeWatch = Form.useWatch('type', form);
  const showStaffSelect = context.kind === 'project' && typeWatch === 'nomina';

  const resetItemState = () => {
    form.resetFields();
    if (lockedType) form.setFieldsValue({ type: lockedType });
    setExtractResult(null);
    setScannedPdfError(false);
    setStep('idle');
    setProgress(0);
    setAutoMatchAttempted(false);
    setSupplierId(null);
    setCreatingSupplier(false);
    setNewSupplierName('');
    setNewSupplierTaxId('');
    setStaffMemberId(null);
    setStaffMemberError(false);
    setCreatingStaffMember(false);
    setNewStaffMemberFirstName('');
    setNewStaffMemberLastName('');
    setSelectedProjectId(null);
    setProjectError(false);
  };

  const runExtraction = (file: File) => {
    const extractionToken = ++extractionTokenRef.current;
    setStep('uploading');
    setProgress(0);

    const onProgress = (percent: number) => {
      if (extractionTokenRef.current !== extractionToken) return;
      setProgress(percent);
      if (percent >= 100) setStep('processing');
    };

    const extraction =
      context.kind === 'project'
        ? extractInvoice(context.projectId, file, onProgress)
        : extractInvoiceStandalone(file, onProgress);

    extraction
      .then((result) => {
        if (extractionTokenRef.current !== extractionToken) return;
        setExtractResult(result);
        setStep('done');
        form.setFieldsValue({
          name: result.fields.name,
          type: lockedType ?? result.fields.type ?? 'factura',
          date: result.fields.date ? dayjs(result.fields.date) : undefined,
          dueDate: result.fields.dueDate ? dayjs(result.fields.dueDate) : undefined,
          amount: result.fields.amount,
          taxBase: result.fields.taxBase,
          taxRate: result.fields.taxRate,
          taxAmount: result.fields.taxAmount,
          irpfRate: result.fields.irpfRate,
          irpfAmount: result.fields.irpfAmount,
          currency: result.fields.currency ?? 'EUR',
          invoiceNumber: result.fields.invoiceNumber,
          issuerName: result.fields.issuerName,
          issuerTaxId: result.fields.issuerTaxId,
        });
      })
      .catch((error: unknown) => {
        if (extractionTokenRef.current !== extractionToken) return;
        setStep('idle');
        setProgress(0);
        if (error instanceof ApiError && error.status === 422) {
          setScannedPdfError(true);
          return;
        }
        void message.error(t('projects.documents.upload.extractError'));
      });
  };

  const beginQueue = (files: File[]) => {
    setQueue(files);
    setCurrentIndex(0);
    resetItemState();
    runExtraction(files[0]);
  };

  const finishQueue = () => {
    form.resetFields();
    if (isMultiQueue) {
      void message.success(t('projects.documents.upload.queue.allDone'));
    }
    onCreated();
  };

  const advanceQueue = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      finishQueue();
      return;
    }
    setCurrentIndex(nextIndex);
    resetItemState();
    runExtraction(queue[nextIndex]);
  };

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (lockedType) form.setFieldsValue({ type: lockedType });
      setQueue([]);
      setCurrentIndex(0);
      setStep('idle');
      setProgress(0);
      setExtractResult(null);
      setScannedPdfError(false);
      setSubmitting(false);
      extractionTokenRef.current += 1;

      setDuplicateCheckParams(null);

      setSupplierId(null);
      setAutoMatchAttempted(false);
      setCreatingSupplier(false);
      setNewSupplierName('');
      setNewSupplierTaxId('');

      setStaffMemberId(null);
      setStaffMemberError(false);
      setCreatingStaffMember(false);
      setNewStaffMemberFirstName('');
      setNewStaffMemberLastName('');

      setSelectedProjectId(null);
      setProjectError(false);
    }
  }, [open, form, context.kind, lockedType]);

  useEffect(() => {
    if (context.kind !== 'project') return;
    if (typeWatch !== 'nomina') {
      setStaffMemberId(null);
      setStaffMemberError(false);
    }
  }, [context.kind, typeWatch]);

  useEffect(() => {
    if (!currentFile) {
      setPdfObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(currentFile);
    setPdfObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentFile]);

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

  const invoiceNumberWatch = Form.useWatch('invoiceNumber', form);
  const amountWatch = Form.useWatch('amount', form);
  const issuerNameWatch = Form.useWatch('issuerName', form);
  const issuerTaxIdWatch = Form.useWatch('issuerTaxId', form);

  const taxBaseWatch = Form.useWatch('taxBase', form);
  const taxAmountWatch = Form.useWatch('taxAmount', form);
  const irpfAmountWatch = Form.useWatch('irpfAmount', form);
  const amountMismatch =
    amountWatch != null &&
    taxBaseWatch != null &&
    taxAmountWatch != null &&
    irpfAmountWatch != null &&
    Math.abs(amountWatch - (taxBaseWatch + taxAmountWatch - irpfAmountWatch)) >
      AMOUNT_MISMATCH_TOLERANCE;

  useEffect(() => {
    if (!open || !invoiceNumberWatch || amountWatch === undefined || amountWatch === null) {
      setDuplicateCheckParams(null);
      return;
    }

    const handle = setTimeout(() => {
      setDuplicateCheckParams({
        issuerName: issuerNameWatch || undefined,
        issuerTaxId: issuerTaxIdWatch || undefined,
        invoiceNumber: invoiceNumberWatch,
        amount: amountWatch,
      });
    }, 500);

    return () => clearTimeout(handle);
  }, [open, invoiceNumberWatch, amountWatch, issuerNameWatch, issuerTaxIdWatch]);

  const { data: duplicateCheckResult } = useQuery({
    ...documentQueries.duplicateCheck(duplicateCheckParams ?? { invoiceNumber: '', amount: 0 }),
    enabled: duplicateCheckParams !== null,
  });
  const duplicateMatches = duplicateCheckResult?.matches ?? [];

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleFilesSelected = (file: RcFile, fileList: RcFile[]): boolean => {
    if (file !== fileList[fileList.length - 1]) return false;

    const pdfFiles = fileList.filter(isPdfFile).slice(0, MAX_QUEUE_FILES);
    if (pdfFiles.length === 0) return false;

    beginQueue(pdfFiles);
    return false;
  };

  const handleRemoveFile = () => {
    extractionTokenRef.current += 1;
    setQueue([]);
    setCurrentIndex(0);
    resetItemState();
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
      await queryClient.invalidateQueries({ queryKey: supplierQueries.all });
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

  const handleSelectStaffMember = (value: string | undefined) => {
    setStaffMemberId(value ?? null);
    setStaffMemberError(false);
  };

  const handleOpenCreateStaffMember = () => {
    setNewStaffMemberFirstName('');
    setNewStaffMemberLastName('');
    setCreatingStaffMember(true);
  };

  const handleCancelCreateStaffMember = () => {
    setCreatingStaffMember(false);
    setNewStaffMemberFirstName('');
    setNewStaffMemberLastName('');
  };

  const handleCreateStaffMemberPopoverOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      handleOpenCreateStaffMember();
    } else {
      handleCancelCreateStaffMember();
    }
  };

  const handleCreateStaffMember = async () => {
    const firstName = newStaffMemberFirstName.trim();
    const lastName = newStaffMemberLastName.trim();
    if (!firstName || !lastName) {
      void message.warning(t('projects.documents.upload.staffMember.createNameRequired'));
      return;
    }

    setCreatingStaffMemberSubmitting(true);
    try {
      const created = await createStaffMember({ firstName, lastName });
      await queryClient.invalidateQueries({ queryKey: staffQueries.all });
      setStaffMemberId(created.id);
      setStaffMemberError(false);
      handleCancelCreateStaffMember();
      void message.success(t('projects.documents.upload.staffMember.created'));
    } catch {
      void message.error(t('projects.documents.upload.staffMember.createError'));
    } finally {
      setCreatingStaffMemberSubmitting(false);
    }
  };

  const handleSelectProject = (value: string | undefined) => {
    setSelectedProjectId(value ?? null);
    setProjectError(false);
  };

  const resolveTarget = (): { projectId: string; staffMemberId: string | null } =>
    context.kind === 'staffPayroll'
      ? { projectId: selectedProjectId ?? '', staffMemberId: context.staffMemberId }
      : { projectId: context.projectId, staffMemberId: showStaffSelect ? staffMemberId : null };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        let hasSelectorError = false;
        if (showStaffSelect && !staffMemberId) {
          setStaffMemberError(true);
          hasSelectorError = true;
        }
        if (showProjectSelect && !selectedProjectId) {
          setProjectError(true);
          hasSelectorError = true;
        }
        if (hasSelectorError) return;

        const { projectId, staffMemberId: targetStaffMemberId } = resolveTarget();
        const { date, dueDate, ...rest } = values;
        const payload: CreateDocumentPayload = {
          ...rest,
          date: date.format('YYYY-MM-DD'),
          dueDate: dueDate ? dueDate.format('YYYY-MM-DD') : undefined,
          month: date.month() + 1,
          supplierId: supplierId ?? undefined,
          staffMemberId: targetStaffMemberId ?? undefined,
        };

        setSubmitting(true);

        createDocument(projectId, payload, currentFile ?? undefined)
          .then(async () => {
            void message.success(t('projects.documents.upload.created'));
            await queryClient.invalidateQueries({ queryKey: documentQueries.all });
            await queryClient.invalidateQueries({ queryKey: projectQueries.all });
            if (isLastInQueue) {
              finishQueue();
            } else {
              advanceQueue();
            }
          })
          .catch(() => {
            void message.error(t('projects.documents.upload.extractError'));
          })
          .finally(() => setSubmitting(false));
      })
      .catch(() => {});
  };

  const handleSkip = () => {
    advanceQueue();
  };

  const isBusy = step === 'uploading' || step === 'processing';
  const progressPercent = step === 'uploading' ? progress : step === 'idle' ? 0 : 100;
  const progressStatus = step === 'done' ? 'success' : step === 'processing' ? 'active' : 'normal';
  const showReviewNote =
    extractResult && (extractResult.confidence === 'low' || extractResult.confidence === 'partial');

  const okLabel = !isMultiQueue
    ? t('projects.documents.upload.submit')
    : isLastInQueue
      ? t('projects.documents.upload.queue.finish')
      : t('projects.documents.upload.queue.saveAndNext');

  const confidenceTag = extractResult && (
    <SemanticTag tone={CONFIDENCE_TONE[extractResult.confidence]}>
      {extractResult.warnings.length > 0 && (
        <ExclamationCircleOutlined style={{ marginInlineEnd: 4 }} />
      )}
      {t(`projects.documents.upload.extraction.confidence.${extractResult.confidence}`)}
    </SemanticTag>
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

  const createStaffMemberPopoverContent = (
    <Flex vertical gap={8} style={{ width: 240 }}>
      <Input
        size="small"
        placeholder={t('projects.documents.upload.staffMember.createFirstNamePlaceholder')}
        value={newStaffMemberFirstName}
        onChange={(event) => setNewStaffMemberFirstName(event.target.value)}
      />
      <Input
        size="small"
        placeholder={t('projects.documents.upload.staffMember.createLastNamePlaceholder')}
        value={newStaffMemberLastName}
        onChange={(event) => setNewStaffMemberLastName(event.target.value)}
      />
      <Flex gap={8} justify="end">
        <Button size="small" onClick={handleCancelCreateStaffMember}>
          {t('common.cancel')}
        </Button>
        <Button
          size="small"
          type="primary"
          loading={creatingStaffMemberSubmitting}
          onClick={() => void handleCreateStaffMember()}
        >
          {t('projects.documents.upload.staffMember.createSubmit')}
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
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width={isDesktop ? 'min(1200px, 96vw)' : '96vw'}
      styles={{
        body: isDesktop
          ? { height: 'min(680px, 86vh)', overflow: 'hidden', paddingTop: 4 }
          : { maxHeight: '86vh', overflowY: 'auto', paddingTop: 4 },
      }}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        ...(isMultiQueue
          ? [
              <Button key="skip" disabled={!currentFile || submitting} onClick={handleSkip}>
                {t('projects.documents.upload.queue.skip')}
              </Button>,
            ]
          : []),
        <Button
          key="ok"
          type="primary"
          loading={submitting}
          disabled={!currentFile || isBusy}
          onClick={handleOk}
        >
          {okLabel}
        </Button>,
      ]}
    >
      <Flex gap={20} style={{ height: isDesktop ? '100%' : 'auto' }} vertical={!isDesktop}>
        <div style={leftPanelStyle}>
          {!currentFile ? (
            <Dragger
              accept="application/pdf"
              multiple
              maxCount={MAX_QUEUE_FILES}
              showUploadList={false}
              disabled={isBusy}
              beforeUpload={handleFilesSelected}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
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
              {isMultiQueue && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('projects.documents.upload.queue.progress', {
                    current: currentIndex + 1,
                    total: queue.length,
                  })}
                </Text>
              )}
              <Flex justify="space-between" align="center" gap={8}>
                <Text
                  ellipsis
                  title={fileName ?? undefined}
                  style={{ flex: '1 1 auto', minWidth: 0 }}
                >
                  {fileName}
                </Text>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  disabled={isBusy}
                  onClick={handleRemoveFile}
                >
                  {t('projects.documents.upload.dropzone.changeFile')}
                </Button>
              </Flex>

              {isBusy && (
                <Progress percent={progressPercent} status={progressStatus} size="small" />
              )}

              {extractResult && (
                <Flex vertical gap={4}>
                  <Flex gap={6} wrap align="center">
                    <SemanticTag tone="neutral">
                      {t(`projects.documents.upload.extraction.source.${extractResult.source}`)}
                    </SemanticTag>
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
          <ConfigProvider theme={{ components: { Form: { itemMarginBottom: SPACE.sm } } }}>
            <Form<DocumentFormFields>
              form={form}
              layout="vertical"
              size="small"
              requiredMark={false}
              initialValues={FORM_INITIAL_VALUES}
            >
              {duplicateMatches.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={t('projects.documents.upload.duplicate.title')}
                  description={
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {duplicateMatches.map((match) => (
                        <li key={match.id}>
                          {t('projects.documents.upload.duplicate.match', {
                            project: match.projectName,
                            name: match.name,
                            date: match.date,
                            amount: formatEUR(match.amount),
                          })}
                        </li>
                      ))}
                    </ul>
                  }
                  style={{ marginBottom: 12 }}
                />
              )}

              <Text strong style={{ fontSize: 13 }}>
                {t('projects.documents.upload.sections.document')}
              </Text>
              <Row gutter={12} style={{ marginTop: 8 }}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    name="name"
                    label={t('projects.documents.upload.fields.name')}
                    rules={[
                      {
                        required: true,
                        message: t('projects.documents.upload.validation.nameRequired'),
                      },
                    ]}
                  >
                    <Input placeholder={t('projects.documents.upload.placeholders.name')} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="type" label={t('projects.documents.upload.fields.type')}>
                    <Select
                      disabled={Boolean(lockedType)}
                      options={DOCUMENT_TYPES.map((type) => ({
                        value: type,
                        label: t(`projects.documents.types.${type}`),
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="status" label={t('projects.documents.upload.fields.status')}>
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
                    rules={[
                      {
                        required: true,
                        message: t('projects.documents.upload.validation.dateRequired'),
                      },
                    ]}
                  >
                    <DatePicker format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="dueDate" label={t('projects.documents.upload.fields.dueDate')}>
                    <DatePicker format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    name="invoiceNumber"
                    label={t('projects.documents.upload.fields.invoiceNumber')}
                  >
                    <Input
                      placeholder={t('projects.documents.upload.placeholders.invoiceNumber')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {(showStaffSelect || showProjectSelect) && (
                <Row gutter={12} align="top">
                  {showStaffSelect && (
                    <Col xs={24} md={8}>
                      <Form.Item
                        label={t('projects.documents.upload.staffMember.label')}
                        validateStatus={staffMemberError ? 'error' : undefined}
                        help={
                          staffMemberError
                            ? t('projects.documents.upload.staffMember.required')
                            : t('projects.documents.upload.staffMember.hint')
                        }
                      >
                        <Select
                          showSearch
                          value={staffMemberId ?? undefined}
                          onChange={handleSelectStaffMember}
                          placeholder={t('projects.documents.upload.staffMember.placeholder')}
                          filterOption={(input, option) =>
                            (option?.label ?? '')
                              .toString()
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={staffMembers.map((member) => ({
                            value: member.id,
                            label: `${member.firstName} ${member.lastName}`,
                          }))}
                        />
                      </Form.Item>
                      <Popover
                        trigger="click"
                        open={creatingStaffMember}
                        onOpenChange={handleCreateStaffMemberPopoverOpenChange}
                        placement="bottomLeft"
                        content={createStaffMemberPopoverContent}
                      >
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          style={{ paddingInlineStart: 0, marginTop: -4 }}
                        >
                          {t('projects.documents.upload.staffMember.createNew')}
                        </Button>
                      </Popover>
                    </Col>
                  )}
                  {showProjectSelect && (
                    <Col xs={24} md={8}>
                      <Form.Item
                        label={t('projects.documents.upload.project.label')}
                        validateStatus={projectError ? 'error' : undefined}
                        help={
                          projectError ? t('projects.documents.upload.project.required') : undefined
                        }
                      >
                        <Select
                          showSearch
                          value={selectedProjectId ?? undefined}
                          onChange={handleSelectProject}
                          placeholder={t('projects.documents.upload.project.placeholder')}
                          filterOption={(input, option) =>
                            (option?.label ?? '')
                              .toString()
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={projects.map((project) => ({
                            value: project.id,
                            label: project.name,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              )}

              <Text strong style={{ fontSize: 13 }}>
                {t('projects.documents.upload.sections.supplier')}
              </Text>
              <Row gutter={12} style={{ marginTop: 8 }} align="top">
                <Col xs={24} md={8}>
                  <Form.Item label={t('projects.documents.upload.supplier.label')}>
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
                        label: supplier.taxId
                          ? `${supplier.name} (${supplier.taxId})`
                          : supplier.name,
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
                    rules={[
                      {
                        required: true,
                        message: t('projects.documents.upload.validation.amountRequired'),
                      },
                      {
                        type: 'number',
                        min: 0,
                        message: t('projects.documents.upload.validation.amountMin'),
                      },
                    ]}
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="currency" label={t('projects.documents.upload.fields.currency')}>
                    <Select
                      options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="taxBase" label={t('projects.documents.upload.fields.taxBase')}>
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="taxRate" label={t('projects.documents.upload.fields.taxRate')}>
                    <InputNumber min={0} max={100} suffix="%" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="direction"
                    label={t('projects.documents.upload.fields.direction')}
                  >
                    <Segmented<DocumentDirectionDto>
                      block
                      options={DOCUMENT_DIRECTIONS.map((direction) => ({
                        value: direction,
                        label: t(`projects.documents.directions.${direction}`),
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="taxAmount"
                    label={t('projects.documents.upload.fields.taxAmount')}
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="irpfRate" label={t('projects.documents.upload.fields.irpfRate')}>
                    <InputNumber min={0} max={100} suffix="%" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="irpfAmount"
                    label={t('projects.documents.upload.fields.irpfAmount')}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
              </Row>
              {amountMismatch && (
                <Alert
                  type="warning"
                  showIcon
                  message={t('projects.documents.upload.validation.amountMismatch')}
                  style={{ marginTop: 8 }}
                />
              )}
            </Form>
          </ConfigProvider>
        </div>
      </Flex>
    </Modal>
  );
}
