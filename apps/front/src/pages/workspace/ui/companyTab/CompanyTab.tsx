import { Button, Card, Col, ColorPicker, Flex, Form, Input, Row, Skeleton, Typography, Upload } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { BRAND_DEFAULT } from '@/shared/config/theme';
import typography from '@/shared/ui/typography.module.css';
import { useCompanyProfileForm, type CompanyProfileFormValues } from '../../model/useCompanyProfileForm';
import workspace from '../workspace.module.css';
import styles from './CompanyTab.module.css';

const { Text } = Typography;

export function CompanyTab() {
  const { t } = useTranslation();
  const { form, loading, logo, onLogoChange, dirty, saving, onValuesChange, save, reset } =
    useCompanyProfileForm();

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div className={workspace.tabBody}>
      <Form<CompanyProfileFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={onValuesChange}
      >
        <div className={workspace.sectionGrid}>
          <Card title={t('workspace.company.identity')}>
            <Row gutter={16}>
              <Col xs={24} sm={8} md={6} lg={4}>
                <Form.Item label={t('company.settings.fields.logo')} className={styles.logoField}>
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onLogoChange(reader.result);
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
                        className={styles.logoPreview}
                      />
                    ) : (
                      <div>
                        <UploadOutlined className={styles.logoPlaceholderIcon} />
                        <div className={`${typography.caption} ${styles.logoPlaceholderText}`}>
                          {t('company.settings.logo.upload')}
                        </div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
                <Text type="secondary" className={styles.hint}>
                  {t('company.settings.logo.hint')}
                </Text>
              </Col>

              <Col xs={24} sm={16} md={18} lg={20}>
                <Row gutter={16}>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      name="name"
                      label={t('company.settings.fields.name')}
                      rules={[
                        { required: true, message: t('company.settings.validation.nameRequired') },
                      ]}
                    >
                      <Input placeholder={t('company.settings.placeholders.name')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item name="legalName" label={t('company.settings.fields.legalName')}>
                      <Input placeholder={t('company.settings.placeholders.legalName')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item name="taxId" label={t('company.settings.fields.taxId')}>
                      <Input placeholder={t('company.settings.placeholders.taxId')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item name="sector" label={t('company.settings.fields.sector')}>
                      <Input placeholder={t('company.settings.placeholders.sector')} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      name="brandColor"
                      label={t('company.settings.fields.brandColor')}
                      className={styles.brandColorField}
                      getValueFromEvent={(color: Color) => color.toHexString()}
                    >
                      <ColorPicker format="hex" disabledAlpha showText />
                    </Form.Item>
                    <Flex justify="space-between" align="center" wrap="wrap">
                      <Text type="secondary" className={styles.hint}>
                        {t('company.settings.brandColor.hint')}
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        className={styles.resetButton}
                        onClick={() => form.setFieldValue('brandColor', BRAND_DEFAULT)}
                      >
                        {t('company.settings.brandColor.reset')}
                      </Button>
                    </Flex>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          <Card title={t('company.settings.sections.contact')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item
                  name="email"
                  label={t('company.settings.fields.email')}
                  rules={[{ type: 'email', message: t('company.settings.validation.emailInvalid') }]}
                >
                  <Input type="email" placeholder={t('company.settings.placeholders.email')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="phone" label={t('company.settings.fields.phone')}>
                  <Input placeholder={t('company.settings.placeholders.phone')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item
                  name="website"
                  label={t('company.settings.fields.website')}
                  rules={[{ type: 'url', message: t('company.settings.validation.urlInvalid') }]}
                >
                  <Input placeholder={t('company.settings.placeholders.website')} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title={t('company.settings.sections.address')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item
                  name="address"
                  label={t('company.settings.fields.address')}
                  className={styles.tightItem}
                >
                  <Input placeholder={t('company.settings.placeholders.address')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item
                  name="city"
                  label={t('company.settings.fields.city')}
                  className={styles.tightItem}
                >
                  <Input placeholder={t('company.settings.placeholders.city')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item
                  name="postalCode"
                  label={t('company.settings.fields.postalCode')}
                  className={styles.tightItem}
                >
                  <Input placeholder={t('company.settings.placeholders.postalCode')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item
                  name="country"
                  label={t('company.settings.fields.country')}
                  className={styles.tightItem}
                >
                  <Input placeholder={t('company.settings.placeholders.country')} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
      </Form>

      <div className={workspace.actionBar}>
        {dirty && <Text type="secondary">{t('workspace.company.unsaved')}</Text>}
        <Button disabled={!dirty} onClick={reset}>
          {t('workspace.company.discard')}
        </Button>
        <Button type="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
