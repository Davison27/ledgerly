import { useEffect, useState } from 'react';
import {
  App,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Typography,
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../../app/providers/CompanyProvider';

const { Text } = Typography;

interface CompanySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface CompanyFormFields {
  name: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export function CompanySettingsModal({ open, onClose }: CompanySettingsModalProps) {
  const { t } = useTranslation();
  const { company, updateCompany } = useCompany();
  const { message } = App.useApp();
  const [form] = Form.useForm<CompanyFormFields>();
  const [logo, setLogo] = useState<string | undefined>(company.logo);

  useEffect(() => {
    if (open) {
      setLogo(company.logo);
      form.setFieldsValue(company);
    }
  }, [open, company, form]);

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then(async (values) => {
        try {
          await updateCompany({ ...values, logo });
          void message.success(t('company.settings.saved'));
          onClose();
        } catch {
          void message.error(t('company.settings.error'));
        }
      })
      .catch(() => {
        // validation errors are shown inline by antd
      });
  };

  return (
    <Modal
      open={open}
      title={t('company.settings.title')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(1080px, 95vw)"
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto', paddingTop: 4 } }}
    >
      <Form<CompanyFormFields>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={company}
      >
        <Row gutter={16}>
          <Col xs={24} sm={8} md={4}>
            <Form.Item label={t('company.settings.fields.logo')} style={{ marginBottom: 4 }}>
              <Upload
                accept="image/*"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setLogo(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={t('company.settings.fields.logo')}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div>
                    <UploadOutlined style={{ fontSize: 20 }} />
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {t('company.settings.logo.upload')}
                    </div>
                  </div>
                )}
              </Upload>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t('company.settings.logo.hint')}
            </Text>
          </Col>

          <Col xs={24} sm={16} md={20}>
            <Text strong>{t('company.settings.sections.general')}</Text>
            <Divider style={{ marginTop: 6, marginBottom: 12 }} />
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="name"
                  label={t('company.settings.fields.name')}
                  style={{ marginBottom: 12 }}
                  rules={[
                    { required: true, message: t('company.settings.validation.nameRequired') },
                  ]}
                >
                  <Input placeholder={t('company.settings.placeholders.name')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="legalName"
                  label={t('company.settings.fields.legalName')}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder={t('company.settings.placeholders.legalName')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="taxId"
                  label={t('company.settings.fields.taxId')}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder={t('company.settings.placeholders.taxId')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="sector"
                  label={t('company.settings.fields.sector')}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder={t('company.settings.placeholders.sector')} />
                </Form.Item>
              </Col>
            </Row>
          </Col>
        </Row>

        <Text strong>{t('company.settings.sections.contact')}</Text>
        <Divider style={{ marginTop: 6, marginBottom: 12 }} />
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="email"
              label={t('company.settings.fields.email')}
              style={{ marginBottom: 12 }}
              rules={[{ type: 'email', message: t('company.settings.validation.emailInvalid') }]}
            >
              <Input type="email" placeholder={t('company.settings.placeholders.email')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="phone"
              label={t('company.settings.fields.phone')}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder={t('company.settings.placeholders.phone')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="website"
              label={t('company.settings.fields.website')}
              style={{ marginBottom: 12 }}
              rules={[{ type: 'url', message: t('company.settings.validation.urlInvalid') }]}
            >
              <Input placeholder={t('company.settings.placeholders.website')} />
            </Form.Item>
          </Col>
        </Row>

        <Text strong>{t('company.settings.sections.address')}</Text>
        <Divider style={{ marginTop: 6, marginBottom: 12 }} />
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="address"
              label={t('company.settings.fields.address')}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t('company.settings.placeholders.address')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="city"
              label={t('company.settings.fields.city')}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t('company.settings.placeholders.city')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="postalCode"
              label={t('company.settings.fields.postalCode')}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t('company.settings.placeholders.postalCode')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="country"
              label={t('company.settings.fields.country')}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t('company.settings.placeholders.country')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
