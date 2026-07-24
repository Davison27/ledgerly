import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, type MenuProps } from 'antd';
import { BulbOutlined, IdcardOutlined, PoweroffOutlined, ShopOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

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
        icon: <ShopOutlined style={{ fontSize: 18 }} />,
        onClick: onCompanySettings,
      },
      {
        key: 'extraction-hints',
        label: t('extractionHints.navLabel'),
        icon: <BulbOutlined style={{ fontSize: 18 }} />,
        onClick: () => void navigate({ to: '/extraction-hints' }),
      },
      {
        key: 'profile',
        label: t('common.profile'),
        icon: <IdcardOutlined style={{ fontSize: 18 }} />,
        onClick: () => void message.info(t('common.comingSoon')),
      },
      {
        key: 'signout',
        label: t('common.signOut'),
        icon: <PoweroffOutlined style={{ fontSize: 18 }} />,
        onClick: () => void navigate({ to: '/' }),
      },
    ],
    [t, navigate, message, onCompanySettings],
  );
}
