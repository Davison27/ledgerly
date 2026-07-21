import { useEffect, useState } from 'react';
import { Button, Flex, Grid, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useSemanticColors } from '../../app/theme/useSemanticColors';
import { SPACE } from '../../app/theme/tokens';
import { companyNeedsSetup, fetchCompany } from '../../data/company';
import logoUrl from '../../assets/ledgerly-logo.svg';
import iconUrl from '../../assets/ledgerly-icon.svg';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const colors = useSemanticColors();
  const screens = useBreakpoint();
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCompany()
      .then((company) => {
        if (cancelled) return;
        setCompanyLogo(company.logo);
        setNeedsSetup(companyNeedsSetup(company));
      })
      .catch(() => {
        // No company profile yet (or the request failed): keep the default logo
        // and treat this as a first run.
        if (!cancelled) setNeedsSetup(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnter = () => {
    void navigate({ to: needsSetup ? '/onboarding' : '/dashboard' });
  };

  const showBrandPanel = screens.md ?? true;

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div
        style={{
          position: 'relative',
          flex: showBrandPanel ? '0 0 45%' : '1 1 100%',
          minWidth: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: SPACE.xl,
          background: token.colorBgContainer,
        }}
      >
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <LanguageSwitcher />
        </div>

        <Flex vertical align="center" gap={20} style={{ width: '100%', maxWidth: 340 }}>
          <img
            src={companyLogo || logoUrl}
            alt={t('common.appName')}
            style={{ width: 200, maxWidth: '100%' }}
          />
          <Flex vertical align="center" gap={4}>
            <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
              {t('login.welcome')}
            </Title>
            <Text type="secondary" style={{ textAlign: 'center' }}>
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
          style={{
            flex: '1 1 55%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${colors.accentCool} 55%, ${token.colorPrimaryActive} 100%)`,
          }}
        >
          <Flex
            vertical
            align="center"
            gap={SPACE.xl}
            style={{ padding: SPACE.xxl + SPACE.lg, textAlign: 'center' }}
          >
            <img
              src={iconUrl}
              alt=""
              aria-hidden="true"
              style={{
                width: 140,
                height: 140,
                borderRadius: 32,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
              }}
            />
            <Text style={{ color: '#ffffff', fontSize: 20, maxWidth: 380, opacity: 0.95 }}>
              {t('login.tagline')}
            </Text>
          </Flex>
        </div>
      )}
    </div>
  );
}
