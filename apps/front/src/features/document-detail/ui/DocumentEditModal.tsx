import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Col,
  ConfigProvider,
  DatePicker,
  Form,
  InputNumber,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  updateDocument,
  documentQueries,
  mapDocumentDto,
  type DocumentDirectionDto,
  type DocumentStatusDto,
  type DocumentTypeDto,
  type ProjectDocument,
  type UpdateDocumentPayload,
} from '@/entities/document';
import { projectQueries } from '@/entities/project';
import { staffQueries } from '@/entities/staff-member';
import { supplierQueries } from '@/entities/supplier';
import { SPACE } from '@/shared/config/theme';

const { Text } = Typography;

interface DocumentEditModalProps {
  open: boolean;
  document: ProjectDocument | null;
  onCancel: () => void;
  onUpdated: (doc: ProjectDocument) => void;
}

interface DocumentEditFormFields {
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

const DOCUMENT_TYPES: DocumentTypeDto[] = ['factura', 'nomina', 'impuesto'];
const DOCUMENT_STATUSES: DocumentStatusDto[] = ['pagado', 'pendiente', 'vencido'];
const DOCUMENT_DIRECTIONS: DocumentDirectionDto[] = ['ingreso', 'gasto'];
const CURRENCIES = ['EUR', 'USD', 'GBP'];

const AMOUNT_MISMATCH_TOLERANCE = 0.02;

function blankToNull(value: string | undefined): string | null {
  return value ? value : null;
}

export function DocumentEditModal({ open, document, onCancel, onUpdated }: DocumentEditModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<DocumentEditFormFields>();
  const [submitting, setSubmitting] = useState(false);

  const { data: suppliers = [] } = useQuery({ ...supplierQueries.list(), enabled: open });
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const { data: staffMembers = [] } = useQuery({ ...staffQueries.list(), enabled: open });
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [staffMemberError, setStaffMemberError] = useState(false);

  useEffect(() => {
    if (!open || !document) return;

    setSupplierId(document.supplierId ?? null);

    setStaffMemberId(document.staffMemberId ?? null);
    setStaffMemberError(false);

    form.setFieldsValue({
      name: document.name,
      type: document.type,
      direction: document.direction,
      status: document.rawStatus,
      date: dayjs(document.date),
      dueDate: document.dueDate ? dayjs(document.dueDate) : undefined,
      amount: document.amount,
      taxBase: document.taxBase,
      taxRate: document.taxRate,
      taxAmount: document.taxAmount,
      irpfRate: document.irpfRate,
      irpfAmount: document.irpfAmount,
      currency: document.currency ?? 'EUR',
      invoiceNumber: document.invoiceNumber,
      issuerName: document.issuerName,
      issuerTaxId: document.issuerTaxId,
    });
  }, [open, document, form]);

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

  const handleSelectStaffMember = (value: string | undefined) => {
    setStaffMemberId(value ?? null);
    setStaffMemberError(false);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const typeWatch = Form.useWatch('type', form);
  const showStaffSelect = typeWatch === 'nomina';

  const amountWatch = Form.useWatch('amount', form);
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

  const handleOk = () => {
    if (!document) return;

    form
      .validateFields()
      .then((values) => {
        if (values.type === 'nomina' && !staffMemberId) {
          setStaffMemberError(true);
          return;
        }

        const payload: UpdateDocumentPayload = {
          name: values.name,
          type: values.type,
          direction: values.direction,
          status: values.status,
          date: values.date.format('YYYY-MM-DD'),
          dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
          amount: values.amount,
          taxBase: values.taxBase ?? null,
          taxRate: values.taxRate ?? null,
          taxAmount: values.taxAmount ?? null,
          irpfRate: values.irpfRate ?? null,
          irpfAmount: values.irpfAmount ?? null,
          currency: values.currency,
          issuerName: blankToNull(values.issuerName),
          issuerTaxId: blankToNull(values.issuerTaxId),
          invoiceNumber: blankToNull(values.invoiceNumber),
          supplierId,
          staffMemberId: values.type === 'nomina' ? staffMemberId : null,
        };

        setSubmitting(true);
        updateDocument(document.projectId, document.id, payload)
          .then(async (updatedDto) => {
            void message.success(t('projects.documents.edit.saved'));
            await queryClient.invalidateQueries({ queryKey: documentQueries.all });
            await queryClient.invalidateQueries({ queryKey: projectQueries.all });
            onUpdated(mapDocumentDto(updatedDto));
          })
          .catch(() => {
            void message.error(t('projects.documents.edit.error'));
          })
          .finally(() => setSubmitting(false));
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={t('projects.documents.edit.title')}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(760px, 96vw)"
      styles={{ body: { maxHeight: '76vh', overflowY: 'auto' } }}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="ok" type="primary" loading={submitting} onClick={handleOk}>
          {t('projects.documents.edit.submit')}
        </Button>,
      ]}
    >
      {document?.hasFile && (
        <Alert
          type="info"
          showIcon
          message={t('projects.documents.edit.fileNote')}
          style={{ marginBottom: 12 }}
        />
      )}

      <ConfigProvider theme={{ components: { Form: { itemMarginBottom: SPACE.sm } } }}>
        <Form<DocumentEditFormFields>
          form={form}
          layout="vertical"
          size="small"
          requiredMark={false}
        >
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
                <Input placeholder={t('projects.documents.upload.placeholders.invoiceNumber')} />
              </Form.Item>
            </Col>
          </Row>

          {showStaffSelect && (
            <Row gutter={12}>
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
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    options={staffMembers.map((member) => ({
                      value: member.id,
                      label: `${member.firstName} ${member.lastName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
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
                    label: supplier.taxId ? `${supplier.name} (${supplier.taxId})` : supplier.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="issuerName" label={t('projects.documents.upload.fields.issuerName')}>
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
              <Form.Item name="direction" label={t('projects.documents.upload.fields.direction')}>
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
              <Form.Item name="taxAmount" label={t('projects.documents.upload.fields.taxAmount')}>
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
    </Modal>
  );
}
