import { useEffect } from 'react';
import {
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type {
  ProjectCurrency,
  ProjectFormValues,
  ProjectStatus,
  ProjectType,
} from '../../../data/company';

const { TextArea } = Input;
const { Text } = Typography;

interface ProjectFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}

interface ProjectFormFields {
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  budget?: number;
  currency?: ProjectCurrency;
  fiscalYear?: string;
  manager?: string;
}

const PROJECT_TYPES: ProjectType[] = [
  'client',
  'internal',
  'audiovisual',
  'construction',
  'consulting',
  'other',
];

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'archived'];

const PROJECT_CURRENCIES: ProjectCurrency[] = ['EUR', 'USD', 'GBP'];

export function ProjectFormModal({ open, onCancel, onSubmit }: ProjectFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ProjectFormFields>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const { startDate, endDate, ...rest } = values;
        const payload: ProjectFormValues = {
          ...rest,
          startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
        };
        form.resetFields();
        onSubmit(payload);
      })
      .catch(() => {
        // validation errors are shown inline by antd
      });
  };

  return (
    <Modal
      open={open}
      title={t('projects.form.title')}
      okText={t('projects.form.submit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnHidden
      width={720}
    >
      <Form<ProjectFormFields>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ status: 'active', currency: 'EUR' }}
      >
        <Text strong>{t('projects.form.sections.general')}</Text>
        <Divider style={{ marginTop: 8, marginBottom: 16 }} />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={t('projects.form.fields.name')}
              rules={[{ required: true, message: t('projects.form.validation.nameRequired') }]}
            >
              <Input placeholder={t('projects.form.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label={t('projects.form.fields.code')}
              rules={[{ required: true, message: t('projects.form.validation.codeRequired') }]}
            >
              <Input placeholder={t('projects.form.placeholders.code')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="type"
              label={t('projects.form.fields.type')}
              rules={[{ required: true, message: t('projects.form.validation.typeRequired') }]}
            >
              <Select
                placeholder={t('projects.form.placeholders.type')}
                options={PROJECT_TYPES.map((type) => ({
                  value: type,
                  label: t(`projects.form.types.${type}`),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="status" label={t('projects.form.fields.status')}>
              <Select
                options={PROJECT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`projects.form.statuses.${status}`),
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t('projects.form.fields.description')}>
          <TextArea rows={3} placeholder={t('projects.form.placeholders.description')} />
        </Form.Item>

        <Text strong>{t('projects.form.sections.client')}</Text>
        <Divider style={{ marginTop: 8, marginBottom: 16 }} />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="clientCompany" label={t('projects.form.fields.clientCompany')}>
              <Input placeholder={t('projects.form.placeholders.clientCompany')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="clientTaxId" label={t('projects.form.fields.clientTaxId')}>
              <Input placeholder={t('projects.form.placeholders.clientTaxId')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="contactName" label={t('projects.form.fields.contactName')}>
              <Input placeholder={t('projects.form.placeholders.contactName')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="contactEmail"
              label={t('projects.form.fields.contactEmail')}
              rules={[
                { type: 'email', message: t('projects.form.validation.emailInvalid') },
              ]}
            >
              <Input
                type="email"
                placeholder={t('projects.form.placeholders.contactEmail')}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="contactPhone" label={t('projects.form.fields.contactPhone')}>
              <Input placeholder={t('projects.form.placeholders.contactPhone')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="address" label={t('projects.form.fields.address')}>
              <Input placeholder={t('projects.form.placeholders.address')} />
            </Form.Item>
          </Col>
        </Row>

        <Text strong>{t('projects.form.sections.planning')}</Text>
        <Divider style={{ marginTop: 8, marginBottom: 16 }} />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="startDate" label={t('projects.form.fields.startDate')}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="endDate" label={t('projects.form.fields.endDate')}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="budget"
              label={t('projects.form.fields.budget')}
              rules={[
                { type: 'number', min: 0, message: t('projects.form.validation.budgetMin') },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder={t('projects.form.placeholders.budget')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="currency" label={t('projects.form.fields.currency')}>
              <Select
                options={PROJECT_CURRENCIES.map((currency) => ({
                  value: currency,
                  label: t(`projects.form.currencies.${currency}`),
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="fiscalYear" label={t('projects.form.fields.fiscalYear')}>
              <Input placeholder={t('projects.form.placeholders.fiscalYear')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="manager"
              label={t('projects.form.fields.manager')}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t('projects.form.placeholders.manager')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
