import { useState, type ReactNode } from 'react';
import { App, Button, Dropdown, Flex, Layout, Tooltip, theme } from 'antd';
import { BellOutlined, MoonOutlined, SettingOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { CompanySettingsModal } from '@/features/company-settings';
import { useSettingsMenuItems } from '../model/useSettingsMenuItems';

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
  const settingsMenu = useSettingsMenuItems({
    onCompanySettings: () => setCompanyModalOpen(true),
  });

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

          <Dropdown
            menu={{ items: settingsMenu, style: { minWidth: 150, padding: 10 } }}
            trigger={['click']}
          >
            <Button
              type="text"
              style={{
                height: 40,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <SettingOutlined style={{ fontSize: 18 }} />
              {t('common.settings')}
            </Button>
          </Dropdown>
        </Flex>
      </Flex>

      <CompanySettingsModal open={companyModalOpen} onClose={() => setCompanyModalOpen(false)} />
    </Layout.Header>
  );
}
