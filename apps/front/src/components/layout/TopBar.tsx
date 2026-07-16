import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  App,
  Button,
  Dropdown,
  Flex,
  Layout,
  Typography,
  theme,
  type MenuProps,
} from 'antd';
import {
  BulbOutlined,
  IdcardOutlined,
  PoweroffOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../../app/providers/CompanyProvider';
import { CompanySettingsModal } from './CompanySettingsModal';
import logoIconUrl from '../../assets/ledgerly-icon.svg';

const { useToken } = theme;
const { Text } = Typography;

export function TopBar() {
  const { token } = useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { company } = useCompany();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  const settingsMenu: MenuProps['items'] = [
    {
      key: 'company',
      label: t('company.settings.title'),
      icon: <ShopOutlined style={{ fontSize: 18 }} />,
      onClick: () => setCompanyModalOpen(true),
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
  ];

  return (
    <Layout.Header
      style={{
        position: 'relative',
        height: 52,
        lineHeight: 'normal',
        padding: '0 16px',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" justify="space-between" style={{ height: '100%' }}>
        <Flex align="center" gap={4}>
          <Button
            type="text"
            aria-label={t('common.appName')}
            style={{ height: 40, padding: '0 8px' }}
            onClick={() => void navigate({ to: '/projects' })}
          >
            <img
              src={company.logo || logoIconUrl}
              alt={t('common.appName')}
              style={{ height: 28, display: 'block', objectFit: 'contain' }}
            />
          </Button>
          <Button
            type="text"
            style={{
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => void navigate({ to: '/suppliers' })}
          >
            <TeamOutlined style={{ fontSize: 18 }} />
            {t('suppliers.navLabel')}
          </Button>
        </Flex>

        <Text
          strong
          style={{
            maxWidth: '50%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {company.name}
        </Text>

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
            <SettingOutlined style={{ fontSize: 20 }} />
            {t('common.settings')}
          </Button>
        </Dropdown>
      </Flex>

      <CompanySettingsModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />
    </Layout.Header>
  );
}
