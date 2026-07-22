import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
  Upload,
} from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ProjectCurrency, ProjectStatus, ProjectType } from '../../../data/company';

const { TextArea } = Input;
const { Text } = Typography;

export interface ProjectFormFieldValues {
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
  startDate?: Dayjs;
  endDate?: Dayjs;
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

interface ProjectFormFieldsProps {
  image?: string;
  onImageChange: (image: string | undefined) => void;
}

export function ProjectFormFields({ image, onImageChange }: ProjectFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={8} md={4}>
          <Form.Item label={t('projects.form.fields.image')} style={{ marginBottom: 4 }}>
            <Upload
              accept="image/*"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    onImageChange(reader.result);
                  }
                };
                reader.readAsDataURL(file);
                return false;
              }}
            >
              {image ? (
                <img
                  src={image}
                  alt={t('projects.form.fields.image')}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div>
                  <ProjectOutlined style={{ fontSize: 20 }} />
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {t('projects.form.image.upload')}
                  </div>
                </div>
              )}
            </Upload>
          </Form.Item>
          {image && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => onImageChange(undefined)}
            >
              {t('projects.form.image.remove')}
            </Button>
          )}
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {t('projects.form.image.hint')}
          </Text>
        </Col>

        <Col xs={24} sm={16} md={20}>
          <Text strong>{t('projects.form.sections.general')}</Text>
          <Divider style={{ marginTop: 6, marginBottom: 12 }} />
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="name"
                label={t('projects.form.fields.name')}
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: t('projects.form.validation.nameRequired') }]}
              >
                <Input placeholder={t('projects.form.placeholders.name')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="code"
                label={t('projects.form.fields.code')}
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: t('projects.form.validation.codeRequired') }]}
              >
                <Input placeholder={t('projects.form.placeholders.code')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="type"
                label={t('projects.form.fields.type')}
                style={{ marginBottom: 12 }}
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
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="status"
                label={t('projects.form.fields.status')}
                style={{ marginBottom: 12 }}
              >
                <Select
                  options={PROJECT_STATUSES.map((status) => ({
                    value: status,
                    label: t(`projects.form.statuses.${status}`),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Col>
      </Row>
      <Form.Item
        name="description"
        label={t('projects.form.fields.description')}
        style={{ marginBottom: 12 }}
      >
        <TextArea rows={2} placeholder={t('projects.form.placeholders.description')} />
      </Form.Item>

      <Text strong>{t('projects.form.sections.client')}</Text>
      <Divider style={{ marginTop: 6, marginBottom: 12 }} />
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="clientCompany"
            label={t('projects.form.fields.clientCompany')}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder={t('projects.form.placeholders.clientCompany')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="clientTaxId"
            label={t('projects.form.fields.clientTaxId')}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder={t('projects.form.placeholders.clientTaxId')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="contactName"
            label={t('projects.form.fields.contactName')}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder={t('projects.form.placeholders.contactName')} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="contactEmail"
            label={t('projects.form.fields.contactEmail')}
            style={{ marginBottom: 12 }}
            rules={[{ type: 'email', message: t('projects.form.validation.emailInvalid') }]}
          >
            <Input type="email" placeholder={t('projects.form.placeholders.contactEmail')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="contactPhone"
            label={t('projects.form.fields.contactPhone')}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder={t('projects.form.placeholders.contactPhone')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="address"
            label={t('projects.form.fields.address')}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder={t('projects.form.placeholders.address')} />
          </Form.Item>
        </Col>
      </Row>

      <Text strong>{t('projects.form.sections.planning')}</Text>
      <Divider style={{ marginTop: 6, marginBottom: 12 }} />
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="startDate"
            label={t('projects.form.fields.startDate')}
            style={{ marginBottom: 12 }}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="endDate"
            label={t('projects.form.fields.endDate')}
            style={{ marginBottom: 12 }}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="budget"
            label={t('projects.form.fields.budget')}
            style={{ marginBottom: 12 }}
            rules={[{ type: 'number', min: 0, message: t('projects.form.validation.budgetMin') }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder={t('projects.form.placeholders.budget')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="currency"
            label={t('projects.form.fields.currency')}
            style={{ marginBottom: 12 }}
          >
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
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="fiscalYear"
            label={t('projects.form.fields.fiscalYear')}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder={t('projects.form.placeholders.fiscalYear')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="manager"
            label={t('projects.form.fields.manager')}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder={t('projects.form.placeholders.manager')} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
