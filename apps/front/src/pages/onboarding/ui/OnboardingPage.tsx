import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Skeleton,
  Steps,
  Typography,
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companyNeedsSetup, companyQueries, updateCompany, useCompany } from '@/entities/company';
import { loadDemoData } from '../api/demo.api';
import { projectQueries } from '@/entities/project';
import typography from '@/shared/ui/typography.module.css';
import styles from './OnboardingPage.module.css';

const { Title, Text } = Typography;

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

const STEP_FIELDS: (keyof CompanyFormFields)[][] = [
  ['name', 'legalName', 'taxId', 'sector'],
  ['email', 'phone', 'website'],
  ['address', 'city', 'postalCode', 'country'],
];

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CompanyFormFields>();
  const [current, setCurrent] = useState(0);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const { company, isLoading: companyLoading } = useCompany();
  const needsSetup = companyNeedsSetup(company);
  const checkingExisting = companyLoading || !needsSetup;

  useEffect(() => {
    if (!companyLoading && !needsSetup) {
      void navigate({ to: '/dashboard' });
    }
  }, [companyLoading, needsSetup, navigate]);

  const { data: projects, isPending: projectsLoading } = useQuery(projectQueries.list());
  const demoAvailable = !projectsLoading && (projects?.length ?? 0) === 0;

  const handleLoadDemoData = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoData();
      await queryClient.invalidateQueries();
      void message.success(t('onboarding.demo.success'));
      void navigate({ to: '/dashboard' });
    } catch {
      void message.error(t('onboarding.demo.error'));
    } finally {
      setLoadingDemo(false);
    }
  };

  const isLastStep = current === STEP_FIELDS.length - 1;

  const handleNext = () => {
    form
      .validateFields(STEP_FIELDS[current])
      .then(() => setCurrent((c) => c + 1))
      .catch(() => {});
  };

  const handleBack = () => setCurrent((c) => c - 1);

  const handleFinish = () => {
    form
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          await updateCompany({ ...values, logo });
          await queryClient.invalidateQueries({ queryKey: companyQueries.singleton().queryKey });
          void message.success(t('onboarding.success'));
          void navigate({ to: '/dashboard' });
        } catch {
          void message.error(t('onboarding.error'));
        } finally {
          setSubmitting(false);
        }
      })
      .catch(() => {});
  };

  if (checkingExisting) {
    return (
      <Flex align="center" justify="center" className={styles.page}>
        <Card className={styles.card}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </Flex>
    );
  }

  return (
    <Flex align="center" justify="center" className={styles.page}>
      <Card className={styles.card}>
        <Flex vertical gap={4} className={styles.intro}>
          <Title level={3} className={styles.title}>
            {t('onboarding.title')}
          </Title>
          <Text type="secondary">{t('onboarding.welcome')}</Text>
        </Flex>

        {demoAvailable && (
          <Alert
            type="info"
            showIcon
            message={t('onboarding.demo.helper')}
            action={
              <Button size="small" onClick={() => void handleLoadDemoData()} loading={loadingDemo}>
                {t('onboarding.demo.button')}
              </Button>
            }
            className={styles.demoAlert}
          />
        )}

        <Steps
          current={current}
          size="small"
          className={styles.steps}
          items={[
            { title: t('onboarding.steps.company') },
            { title: t('onboarding.steps.contact') },
            { title: t('onboarding.steps.address') },
          ]}
        />

        <Form<CompanyFormFields> form={form} layout="vertical" requiredMark={false}>
          <div className={styles.stepPanel} data-active={current === 0}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item label={t('company.settings.fields.logo')} className={styles.logoItem}>
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
                        className={styles.logoImage}
                      />
                    ) : (
                      <div>
                        <UploadOutlined className={styles.uploadIcon} />
                        <Text className={`${typography.caption} ${styles.uploadHint}`}>
                          {t('company.settings.logo.upload')}
                        </Text>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
              <Col xs={24} sm={16}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label={t('company.settings.fields.name')}
                      rules={[
                        {
                          required: true,
                          message: t('company.settings.validation.nameRequired'),
                        },
                      ]}
                    >
                      <Input placeholder={t('company.settings.placeholders.name')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="legalName" label={t('company.settings.fields.legalName')}>
                      <Input placeholder={t('company.settings.placeholders.legalName')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="taxId" label={t('company.settings.fields.taxId')}>
                      <Input placeholder={t('company.settings.placeholders.taxId')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="sector" label={t('company.settings.fields.sector')}>
                      <Input placeholder={t('company.settings.placeholders.sector')} />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>

          <div className={styles.stepPanel} data-active={current === 1}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="email"
                  label={t('company.settings.fields.email')}
                  rules={[
                    { type: 'email', message: t('company.settings.validation.emailInvalid') },
                  ]}
                >
                  <Input type="email" placeholder={t('company.settings.placeholders.email')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="phone" label={t('company.settings.fields.phone')}>
                  <Input placeholder={t('company.settings.placeholders.phone')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="website"
                  label={t('company.settings.fields.website')}
                  rules={[
                    { type: 'url', message: t('company.settings.validation.urlInvalid') },
                  ]}
                >
                  <Input placeholder={t('company.settings.placeholders.website')} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className={styles.stepPanel} data-active={current === 2}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="address" label={t('company.settings.fields.address')}>
                  <Input placeholder={t('company.settings.placeholders.address')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="city" label={t('company.settings.fields.city')}>
                  <Input placeholder={t('company.settings.placeholders.city')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="postalCode" label={t('company.settings.fields.postalCode')}>
                  <Input placeholder={t('company.settings.placeholders.postalCode')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="country" label={t('company.settings.fields.country')}>
                  <Input placeholder={t('company.settings.placeholders.country')} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>

        <Flex justify="space-between" className={styles.footer}>
          <Button disabled={current === 0} onClick={handleBack}>
            {t('onboarding.back')}
          </Button>
          {isLastStep ? (
            <Button type="primary" loading={submitting} onClick={handleFinish}>
              {t('onboarding.finish')}
            </Button>
          ) : (
            <Button type="primary" onClick={handleNext}>
              {t('onboarding.next')}
            </Button>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
