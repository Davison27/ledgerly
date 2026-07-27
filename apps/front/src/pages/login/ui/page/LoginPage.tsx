import { Button, Flex, Grid, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../language/LanguageSwitcher';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { SPACE } from '@/shared/config/theme';
import { companyNeedsSetup, useCompany } from '@/entities/company';
import logoUrl from '../../../../assets/ledgerly-logo.svg';
import iconUrl from '../../../../assets/ledgerly-icon.svg';
import styles from './LoginPage.module.css';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const colors = useSemanticColors();
  const screens = useBreakpoint();
  const { company, isLoading: checking } = useCompany();
  const needsSetup = companyNeedsSetup(company);

  const handleEnter = () => {
    void navigate({ to: needsSetup ? '/onboarding' : '/dashboard' });
  };

  const showBrandPanel = screens.md ?? true;

  return (
    <div className={styles.page}>
      <div className={styles.formPanel} data-full-width={!showBrandPanel}>
        <div className={styles.langSwitcher}>
          <LanguageSwitcher />
        </div>

        <Flex vertical align="center" gap={20} className={styles.formCard}>
          <img src={company.logo || logoUrl} alt={t('common.appName')} className={styles.logo} />
          <Flex vertical align="center" gap={4}>
            <Title level={3} className={styles.title}>
              {t('login.welcome')}
            </Title>
            <Text type="secondary" className={styles.subtitle}>
              {t('login.subtitle')}
            </Text>
          </Flex>
          <Button
            type="primary"
            size="large"
            block
            loading={checking}
            onClick={handleEnter}
          >
            {t('login.signIn')}
          </Button>
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
            <Text className={styles.tagline}>{t('login.tagline')}</Text>
          </Flex>
        </div>
      )}
    </div>
  );
}
