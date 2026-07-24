import { useState, type ReactNode } from 'react';
import { App, Button, Flex, Layout, Tooltip, theme } from 'antd';
import { BellOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { CompanySettingsModal } from '@/features/company-settings';
import { useCompany } from '@/entities/company';

const { useToken } = theme;

export interface TopBarProps {
  search?: ReactNode;
}

export function TopBar({ search }: TopBarProps) {
  const { token } = useToken();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const themeToggleLabel = mode === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark');
  const { company } = useCompany();

  return (
    <Layout.Header
      style={{
        position: 'relative',
        flex: 'none',
        height: LAYOUT.topbarHeight,
        lineHeight: 'normal',
        padding: `0 ${SPACE.lg}px`,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" justify="space-between" gap={SPACE.md} style={{ height: '100%' }}>
        <Flex align="center" style={{ flex: 1, minWidth: 0 }}>
          {search}
        </Flex>

        <Flex align="center" gap={SPACE.xs} style={{ flex: 'none' }}>
          <Tooltip title={t('topbar.notifications')}>
            <Button
              type="text"
              aria-label={t('topbar.notifications')}
              onClick={() => void message.info(t('common.comingSoon'))}
              style={{
                height: 40,
                width: 40,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BellOutlined style={{ fontSize: 18 }} />
            </Button>
          </Tooltip>

          <Tooltip title={themeToggleLabel}>
            <Button
              type="text"
              aria-label={t('theme.ariaLabel')}
              onClick={toggle}
              style={{
                height: 40,
                width: 40,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'dark' ? (
                <MoonOutlined style={{ fontSize: 18 }} />
              ) : (
                <SunOutlined style={{ fontSize: 18 }} />
              )}
            </Button>
          </Tooltip>

          <div aria-label={t('common.appName')}>
            <img
              src={company.logo}
              alt={t('common.appName')}
              style={{ height: 28, display: 'block', objectFit: 'contain' }}
            />
          </div>
        </Flex>
      </Flex>

      <CompanySettingsModal open={companyModalOpen} onClose={() => setCompanyModalOpen(false)} />
    </Layout.Header>
  );
}
