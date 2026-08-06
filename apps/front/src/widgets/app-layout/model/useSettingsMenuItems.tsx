import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { type MenuProps } from 'antd';
import {
  ApiOutlined,
  BulbOutlined,
  PoweroffOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { logout } from '@/entities/session';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import styles from './useSettingsMenuItems.module.css';

export function useSettingsMenuItems(): MenuProps['items'] {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useWorkspaceAccess();

  return useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              key: 'company',
              label: t('workspace.tabs.company'),
              icon: <ShopOutlined className={styles.menuIcon} />,
              onClick: () => void navigate({ to: '/workspace', search: { tab: 'company' } }),
            },
            {
              key: 'members',
              label: t('workspace.tabs.members'),
              icon: <TeamOutlined className={styles.menuIcon} />,
              onClick: () => void navigate({ to: '/workspace', search: { tab: 'members' } }),
            },
            {
              key: 'integrations',
              label: t('workspace.tabs.integrations'),
              icon: <ApiOutlined className={styles.menuIcon} />,
              onClick: () => void navigate({ to: '/workspace', search: { tab: 'integrations' } }),
            },
            {
              key: 'tax-compliance',
              label: t('workspace.tabs.taxCompliance'),
              icon: <SafetyCertificateOutlined className={styles.menuIcon} />,
              onClick: () => void navigate({ to: '/workspace', search: { tab: 'tax-compliance' } }),
            },
          ]
        : []),
      {
        key: 'extraction-hints',
        label: t('extractionHints.navLabel'),
        icon: <BulbOutlined className={styles.menuIcon} />,
        onClick: () => void navigate({ to: '/extraction-hints' }),
      },
      {
        key: 'signout',
        label: t('common.signOut'),
        icon: <PoweroffOutlined className={styles.menuIcon} />,
        onClick: () => {
          void (async () => {
            try {
              await logout();
            } finally {
              queryClient.clear();
              void navigate({ to: '/', search: { signedOut: true } });
            }
          })();
        },
      },
    ],
    [t, navigate, queryClient, isAdmin],
  );
}
