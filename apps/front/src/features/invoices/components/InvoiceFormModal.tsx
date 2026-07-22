import { useEffect, useState } from 'react';
import {
  AutoComplete,
  Button,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getProject, listProjects } from '../../../data/api/projects.api';
import { listProducts } from '../../../data/api/products.api';
import type {
  CreateInvoiceLinePayload,
  CreateInvoicePayload,
  ProductDto,
  ProjectSummaryDto,
} from '../../../data/api/types';
import { computeInvoiceTotals } from '../totals';

const { TextArea } = Input;
const { Text } = Typography;

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

interface InvoiceLineFormValue {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  productId?: string;
}

interface InvoiceFormFields {
  projectId?: string;
  lines: InvoiceLineFormValue[];
  taxRate?: number;
  irpfRate?: number;
  customerName?: string;
  customerTaxId?: string;
  customerAddress?: string;
  notes?: string;
}

const FORM_INITIAL_VALUES: Partial<InvoiceFormFields> = {
  lines: [{ description: '', quantity: 1, unitPrice: undefined }],
  taxRate: 21,
  irpfRate: 0,
};

interface InvoiceFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateInvoicePayload) => void | Promise<void>;
  submitting?: boolean;
}

export function InvoiceFormModal({ open, onCancel, onSubmit, submitting }: InvoiceFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<InvoiceFormFields>();
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      listProjects()
        .then(setProjects)
        .catch(() => setProjects([]));
      listProducts()
        .then(setProducts)
        .catch(() => setProducts([]));
    }
  }, [open, form]);

  const linesWatch = Form.useWatch('lines', form) ?? [];
  const taxRateWatch = Form.useWatch('taxRate', form);
  const irpfRateWatch = Form.useWatch('irpfRate', form);
  const totals = computeInvoiceTotals(linesWatch, taxRateWatch, irpfRateWatch);

  const productOptions =
    products.length > 0
      ? [
          {
            label: t('invoices.lines.productGroup'),
            options: products.map((product) => ({
              value: product.name,
              label: product.name,
            })),
          },
        ]
      : [];

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleProjectChange = async (projectId: string) => {
    setLoadingProject(true);
    try {
      const project = await getProject(projectId);
      form.setFieldsValue({
        customerName: project.clientCompany ?? '',
        customerTaxId: project.clientTaxId ?? undefined,
        customerAddress: project.address ?? undefined,
      });
      // eslint-disable-next-line no-empty
    } catch {
    } finally {
      setLoadingProject(false);
    }
  };

  const handleProductSelect = (lineIndex: number, value: string) => {
    const product = products.find((candidate) => candidate.name === value);
    if (!product) return;
    form.setFieldValue(['lines', lineIndex, 'productId'], product.id);
    form.setFieldValue(['lines', lineIndex, 'unitPrice'], product.price ?? undefined);
  };

  const handleDescriptionChange = (lineIndex: number, value: string) => {
    const productId = form.getFieldValue(['lines', lineIndex, 'productId']) as string | undefined;
    if (!productId) return;
    const selectedProduct = products.find((product) => product.id === productId);
    if (selectedProduct && selectedProduct.name !== value) {
      form.setFieldValue(['lines', lineIndex, 'productId'], undefined);
    }
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: CreateInvoicePayload = {
          projectId: values.projectId!,
          lines: values.lines.map((line) => {
            const mappedLine: CreateInvoiceLinePayload = {
              description: line.description!,
              quantity: line.quantity!,
              unitPrice: line.unitPrice!,
            };
            if (line.productId) {
              mappedLine.productId = line.productId;
            }
            return mappedLine;
          }),
          taxRate: values.taxRate,
          irpfRate: values.irpfRate,
          customerName: values.customerName!,
          customerTaxId: values.customerTaxId,
          customerAddress: values.customerAddress,
          notes: values.notes,
        };
        void onSubmit(payload);
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={t('invoices.form.title')}
      okText={t('invoices.form.submit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(760px, 95vw)"
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
    >
      <Form<InvoiceFormFields>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={FORM_INITIAL_VALUES}
      >
        <Form.Item
          name="projectId"
          label={t('invoices.fields.project')}
          style={{ marginBottom: 12 }}
          rules={[{ required: true, message: t('invoices.form.validation.projectRequired') }]}
        >
          <Select
            showSearch
            loading={loadingProject}
            placeholder={t('invoices.form.placeholders.project')}
            onChange={(value: string) => void handleProjectChange(value)}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            options={projects.map((project) => ({
              value: project.id,
              label: `${project.name} (${project.code})`,
            }))}
          />
        </Form.Item>

        <Text strong style={{ fontSize: 13 }}>
          {t('invoices.lines.title')}
        </Text>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <Flex vertical gap={4} style={{ marginTop: 8, marginBottom: 8 }}>
              {fields.length > 0 && (
                <Row gutter={12}>
                  <Col flex="auto">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('invoices.lines.columns.description')}
                    </Text>
                  </Col>
                  <Col flex="0 0 100px">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('invoices.lines.columns.quantity')}
                    </Text>
                  </Col>
                  <Col flex="0 0 140px">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('invoices.lines.columns.unitPrice')}
                    </Text>
                  </Col>
                  <Col flex="0 0 32px" />
                </Row>
              )}
              {fields.map((field) => (
                <Row gutter={12} key={field.key} align="top">
                  <Col flex="auto">
                    <Form.Item
                      {...field}
                      name={[field.name, 'description']}
                      style={{ marginBottom: 8 }}
                      rules={[
                        {
                          required: true,
                          message: t('invoices.form.validation.lineDescriptionRequired'),
                        },
                      ]}
                    >
                      <AutoComplete
                        options={productOptions}
                        filterOption={(inputValue, option) =>
                          (option?.label ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
                        }
                        onSelect={(value: string) => handleProductSelect(field.name, value)}
                        onChange={(value: string) => handleDescriptionChange(field.name, value)}
                        aria-label={t('invoices.lines.columns.description')}
                        placeholder={t('invoices.lines.descriptionPlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 100px">
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      style={{ marginBottom: 8 }}
                      rules={[
                        {
                          required: true,
                          message: t('invoices.form.validation.lineQuantityRequired'),
                        },
                        {
                          type: 'number',
                          min: 0.001,
                          message: t('invoices.form.validation.lineQuantityMin'),
                        },
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0.001}
                        step={1}
                        aria-label={t('invoices.lines.columns.quantity')}
                        placeholder={t('invoices.lines.quantityPlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 140px">
                    <Form.Item
                      {...field}
                      name={[field.name, 'unitPrice']}
                      style={{ marginBottom: 8 }}
                      rules={[
                        {
                          required: true,
                          message: t('invoices.form.validation.lineUnitPriceRequired'),
                        },
                        {
                          type: 'number',
                          min: 0,
                          message: t('invoices.form.validation.lineUnitPriceMin'),
                        },
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        aria-label={t('invoices.lines.columns.unitPrice')}
                        placeholder={t('invoices.lines.unitPricePlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                  <Form.Item {...field} name={[field.name, 'productId']} hidden>
                    <Input />
                  </Form.Item>
                  <Col flex="0 0 32px">
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label={t('invoices.lines.remove')}
                      disabled={fields.length <= 1}
                      onClick={() => remove(field.name)}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ description: '', quantity: 1, unitPrice: undefined })}
              >
                {t('invoices.lines.add')}
              </Button>
            </Flex>
          )}
        </Form.List>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="taxRate"
              label={t('invoices.fields.taxRate')}
              style={{ marginBottom: 12 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="irpfRate"
              label={t('invoices.fields.irpfRate')}
              style={{ marginBottom: 12 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="customerName"
              label={t('invoices.fields.customerName')}
              style={{ marginBottom: 12 }}
              rules={[{ required: true, message: t('invoices.form.validation.customerNameRequired') }]}
            >
              <Input placeholder={t('invoices.form.placeholders.customerName')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="customerTaxId"
              label={t('invoices.fields.customerTaxId')}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder={t('invoices.form.placeholders.customerTaxId')} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="customerAddress"
          label={t('invoices.fields.customerAddress')}
          style={{ marginBottom: 12 }}
        >
          <Input placeholder={t('invoices.form.placeholders.customerAddress')} />
        </Form.Item>

        <Form.Item name="notes" label={t('invoices.fields.notes')} style={{ marginBottom: 12 }}>
          <TextArea rows={2} placeholder={t('invoices.form.placeholders.notes')} />
        </Form.Item>

        <Flex vertical gap={2} style={{ marginTop: 4 }}>
          <Flex justify="space-between">
            <Text type="secondary">{t('invoices.totals.base')}</Text>
            <Text>{formatAmount(totals.taxBase)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text type="secondary">
              {t('invoices.totals.tax', { rate: taxRateWatch ?? 0 })}
            </Text>
            <Text>{formatAmount(totals.taxAmount)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text type="secondary">
              {t('invoices.totals.irpf', { rate: irpfRateWatch ?? 0 })}
            </Text>
            <Text>-{formatAmount(totals.irpfAmount)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text strong>{t('invoices.totals.total')}</Text>
            <Text strong>{formatAmount(totals.total)}</Text>
          </Flex>
        </Flex>
      </Form>
    </Modal>
  );
}
