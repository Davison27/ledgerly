import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, type MenuProps } from 'antd';
import { BulbOutlined, IdcardOutlined, PoweroffOutlined, ShopOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './useSettingsMenuItems.module.css';

export interface UseSettingsMenuItemsParams {
  onCompanySettings: () => void;
}

export function useSettingsMenuItems({
  onCompanySettings,
}: UseSettingsMenuItemsParams): MenuProps['items'] {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();

  return useMemo(
    () => [
      {
        key: 'company',
        label: t('company.settings.title'),
        icon: <ShopOutlined className={styles.menuIcon} />,
        onClick: onCompanySettings,
      },
      {
        key: 'extraction-hints',
        label: t('extractionHints.navLabel'),
        icon: <BulbOutlined className={styles.menuIcon} />,
        onClick: () => void navigate({ to: '/extraction-hints' }),
      },
      {
        key: 'profile',
        label: t('common.profile'),
        icon: <IdcardOutlined className={styles.menuIcon} />,
        onClick: () => void message.info(t('common.comingSoon')),
      },
      {
        key: 'signout',
        label: t('common.signOut'),
        icon: <PoweroffOutlined className={styles.menuIcon} />,
        onClick: () => void navigate({ to: '/' }),
      },
    ],
    [t, navigate, message, onCompanySettings],
  );
}
