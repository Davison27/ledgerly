import type { ReactNode } from 'react';
import { Button, Flex, Layout, Tooltip } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { SPACE } from '@/shared/config/theme';
import { NotificationBell } from '../notificationBell/NotificationBell';
import styles from './TopBar.module.css';

export interface TopBarProps {
  search?: ReactNode;
}

export function TopBar({ search }: TopBarProps) {
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
  const themeToggleLabel = mode === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark');

  return (
    <Layout.Header className={styles.header}>
      <Flex align="center" justify="space-between" gap={SPACE.md} className={styles.inner}>
        <Flex align="center" className={styles.searchSlot}>
          {search}
        </Flex>

        <Flex align="center" gap={SPACE.xs} className={styles.actions}>
          <NotificationBell />

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
        </Flex>
      </Flex>
    </Layout.Header>
  );
}
