import { type CSSProperties } from 'react';
import { Alert, Button, ConfigProvider, Flex, Form, Input, Tooltip, Typography } from 'antd';
import { GoogleOutlined, LockOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BRAND_DEFAULT, buildThemeConfig } from '@/shared/config/theme';
import { companyQueries } from '@/entities/company';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { useLoginPage } from '../../model/useLoginPage';
import { LanguageSwitcher } from '../language/LanguageSwitcher';
import { ProductTour } from '../productTour/ProductTour';
import styles from './LoginPage.module.css';

const { Title, Text } = Typography;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

interface BootstrapFormValues {
  email: string;
}

function resolveBrandColor(value: string | null | undefined): string {
  return value && HEX_COLOR.test(value) ? value : BRAND_DEFAULT;
}

function resolveBrandForeground(color: string): string {
  const channels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map(
    (value) => Number.parseInt(value, 16) / 255,
  );
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const graphiteContrast = (luminance + 0.05) / 0.06;

  return whiteContrast >= graphiteContrast ? '#ffffff' : '#111418';
}

export function LoginPage() {
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
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

  const workspaceName = branding?.name.trim() || t('login.workspace.fallbackName');
  const brandColor = resolveBrandColor(branding?.brandColor);
  const pageStyle = {
    '--login-brand': brandColor,
    '--login-brand-foreground': resolveBrandForeground(brandColor),
  } as CSSProperties;

  const handleBootstrapFinish = (values: BootstrapFormValues) => {
    void handleBootstrapSubmit(values.email);
  };

  return (
    <ConfigProvider theme={buildThemeConfig(mode, brandColor)}>
      <main className={styles.page} data-theme={mode} style={pageStyle}>
        <div className={styles.ambientLight} aria-hidden="true" />

        <section className={styles.formPanel} aria-labelledby="login-heading">
          <header className={styles.topbar}>
            <Tooltip title={mode === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark')}>
              <Button
                type="text"
                aria-label={t('theme.ariaLabel')}
                onClick={toggle}
                className={styles.themeToggle}
              >
                {mode === 'dark' ? <MoonOutlined /> : <SunOutlined />}
              </Button>
            </Tooltip>
            <LanguageSwitcher />
          </header>

          <div className={styles.accessContent}>
            <div className={styles.formCard}>
              <div className={styles.identity}>
                {branding?.logo ? (
                  <img src={branding.logo} alt={workspaceName} className={styles.logo} />
                ) : (
                  <div className={styles.monogram} aria-hidden="true">
                    {workspaceName.charAt(0).toUpperCase()}
                  </div>
                )}

                <Text className={styles.workspaceLabel}>{t('login.workspace.label')}</Text>
                <Title id="login-heading" level={1} className={styles.title}>
                  {t('login.workspace.title', { name: workspaceName })}
                </Title>
                <Text className={styles.subtitle}>{t('login.workspace.subtitle')}</Text>
              </div>

              <Flex vertical gap={16} className={styles.authPanel}>
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
                        <Text strong className={styles.setupTitle}>
                          {t('login.setup.title')}
                        </Text>
                        <Text className={styles.setupSubtitle}>{t('login.setup.subtitle')}</Text>
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
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          loading={bootstrapSubmitting}
                          className={styles.primaryAction}
                        >
                          {t('login.setup.submit')}
                        </Button>
                      </Form>
                      <Text className={styles.setupHint}>{t('login.setup.hint')}</Text>
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
                    className={styles.primaryAction}
                  >
                    {t('login.signInWithGoogle')}
                  </Button>
                )}
              </Flex>

              <div className={styles.trustLine}>
                <LockOutlined aria-hidden="true" />
                <Text>{t('login.secureAccess')}</Text>
              </div>
            </div>
          </div>

          <footer className={styles.signature}>{t('login.managedBy')}</footer>
        </section>

        <section className={styles.previewPanel}>
          <ProductTour workspaceName={workspaceName} logo={branding?.logo} />
        </section>
      </main>
    </ConfigProvider>
  );
}
