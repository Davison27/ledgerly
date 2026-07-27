import type { ReactNode } from 'react';
import { App, Button, Flex, Layout, Tooltip } from 'antd';
import { BellOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { SPACE } from '@/shared/config/theme';
import { useCompany } from '@/entities/company';
import styles from './TopBar.module.css';

export interface TopBarProps {
  search?: ReactNode;
}

export function TopBar({ search }: TopBarProps) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
  const themeToggleLabel = mode === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark');
  const { company } = useCompany();

  return (
    <Layout.Header className={styles.header}>
      <Flex align="center" justify="space-between" gap={SPACE.md} className={styles.inner}>
        <Flex align="center" className={styles.searchSlot}>
          {search}
        </Flex>

        <Flex align="center" gap={SPACE.xs} className={styles.actions}>
          <Tooltip title={t('topbar.notifications')}>
            <Button
              type="text"
              aria-label={t('topbar.notifications')}
              onClick={() => void message.info(t('common.comingSoon'))}
              className={styles.iconButton}
            >
              <BellOutlined className={styles.icon} />
            </Button>
          </Tooltip>

          <Tooltip title={themeToggleLabel}>
            <Button
              type="text"
              aria-label={t('theme.ariaLabel')}
              onClick={toggle}
              className={styles.iconButton}
            >
              {mode === 'dark' ? (
                <MoonOutlined className={styles.icon} />
              ) : (
                <SunOutlined className={styles.icon} />
              )}
            </Button>
          </Tooltip>

          <div aria-label={t('common.appName')}>
            <img src={company.logo} alt={t('common.appName')} className={styles.logo} />
          </div>
        </Flex>
      </Flex>
    </Layout.Header>
  );
}
