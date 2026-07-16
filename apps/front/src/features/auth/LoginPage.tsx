import { useEffect, useState } from 'react';
import { Button, Card, Flex, Layout, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { fetchCompany } from '../../data/company';
import logoUrl from '../../assets/ledgerly-logo.svg';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetchCompany()
      .then((company) => {
        if (!cancelled) setCompanyLogo(company.logo);
      })
      .catch(() => {
        // No company profile yet (or the request failed): keep the default logo.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Content
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <LanguageSwitcher />
        </div>

        <Card style={{ width: 400 }}>
          <Flex vertical align="center" gap={24}>
            <img
              src={companyLogo || logoUrl}
              alt={t('common.appName')}
              style={{ width: 180 }}
            />
            <Typography.Text type="secondary">
              {t('login.subtitle')}
            </Typography.Text>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => void navigate({ to: '/projects' })}
            >
              {t('login.signIn')}
            </Button>
          </Flex>
        </Card>
      </Layout.Content>
    </Layout>
  );
}
