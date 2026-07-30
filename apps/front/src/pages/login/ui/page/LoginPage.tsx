import { Alert, Button, Flex, Form, Grid, Input, Typography, theme } from 'antd';
import { CalendarOutlined, FileTextOutlined, GoogleOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LanguageSwitcher } from '../language/LanguageSwitcher';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { SPACE } from '@/shared/config/theme';
import { companyQueries } from '@/entities/company';
import { useLoginPage } from '../../model/useLoginPage';
import logoUrl from '../../../../assets/ledgerly-logo.svg';
import iconUrl from '../../../../assets/ledgerly-icon.svg';
import styles from './LoginPage.module.css';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

const PRODUCT_FEATURES = [
  { key: 'projects', icon: <TeamOutlined /> },
  { key: 'documents', icon: <FileTextOutlined /> },
  { key: 'finance', icon: <WalletOutlined /> },
  { key: 'calendar', icon: <CalendarOutlined /> },
] as const;

interface BootstrapFormValues {
  email: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const colors = useSemanticColors();
  const screens = useBreakpoint();
  const { data: branding } = useQuery(companyQueries.branding());
  const [form] = Form.useForm<BootstrapFormValues>();
  const {
    status,
    authError,
    sessionNotice,
    bootstrapSubmitting,
    bootstrapError,
    handleBootstrapSubmit,
    signInSubmitting,
    handleSignIn,
  } = useLoginPage();

  const showBrandPanel = screens.md ?? true;

  const handleBootstrapFinish = (values: BootstrapFormValues) => {
    void handleBootstrapSubmit(values.email);
  };

  return (
    <div className={styles.page}>
      <div className={styles.formPanel} data-full-width={!showBrandPanel}>
        <div className={styles.langSwitcher}>
          <LanguageSwitcher />
        </div>

        <Flex vertical align="center" gap={20} className={styles.formCard}>
          <img src={branding?.logo || logoUrl} alt={t('common.appName')} className={styles.logo} />
          <Flex vertical align="center" gap={4}>
            <Title level={3} className={styles.title}>
              {t('login.welcome')}
            </Title>
            <Text type="secondary" className={styles.subtitle}>
              {t('login.subtitle')}
            </Text>
          </Flex>

          {authError && (
            <Alert
              type="error"
              showIcon
              message={t(`login.errors.${authError}`)}
              className={styles.alert}
            />
          )}

          {sessionNotice && (
            <Alert
              type="info"
              showIcon
              message={t(`session.${sessionNotice}`)}
              className={styles.alert}
            />
          )}

          {status === 'bootstrap' &&
            (bootstrapError ? (
              <Alert
                type="error"
                showIcon
                message={t(`login.setup.errors.${bootstrapError}`)}
                className={styles.alert}
              />
            ) : (
              <Flex vertical gap={12} className={styles.setupPanel}>
                <Flex vertical gap={4}>
                  <Text strong>{t('login.setup.title')}</Text>
                  <Text type="secondary" className={styles.setupSubtitle}>
                    {t('login.setup.subtitle')}
                  </Text>
                </Flex>
                <Form<BootstrapFormValues>
                  form={form}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={handleBootstrapFinish}
                >
                  <Form.Item
                    name="email"
                    label={t('login.setup.emailLabel')}
                    rules={[{ required: true, type: 'email' }]}
                  >
                    <Input type="email" placeholder={t('login.setup.emailPlaceholder')} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={bootstrapSubmitting}>
                    {t('login.setup.submit')}
                  </Button>
                </Form>
                <Text type="secondary" className={styles.setupHint}>
                  {t('login.setup.hint')}
                </Text>
              </Flex>
            ))}

          {(status === 'signIn' || status === 'loading') && (
            <Button
              type="primary"
              size="large"
              block
              icon={<GoogleOutlined />}
              loading={status === 'loading' || signInSubmitting}
              onClick={() => void handleSignIn()}
            >
              {t('login.signInWithGoogle')}
            </Button>
          )}
        </Flex>
      </div>

      {showBrandPanel && (
        <div
          className={styles.brandPanel}
          style={{
            background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${colors.accentCool} 55%, ${token.colorPrimaryActive} 100%)`,
          }}
        >
          <Flex vertical align="center" gap={SPACE.xl} className={styles.brandContent}>
            <img src={iconUrl} alt="" aria-hidden="true" className={styles.brandIcon} />
            <Flex vertical align="center" gap={8}>
              <Title level={2} className={styles.brandTitle}>{t('login.product.title')}</Title>
              <Text className={styles.tagline}>{t('login.tagline')}</Text>
            </Flex>
            <div className={styles.featureList}>
              {PRODUCT_FEATURES.map(({ key, icon }) => (
                <div key={key} className={styles.featureItem}>
                  <span className={styles.featureIcon}>{icon}</span>
                  <div>
                    <Text strong className={styles.featureTitle}>{t(`login.product.features.${key}.title`)}</Text>
                    <Text className={styles.featureDescription}>{t(`login.product.features.${key}.description`)}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Flex>
        </div>
      )}
    </div>
  );
}
