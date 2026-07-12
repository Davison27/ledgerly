import { useNavigate, useParams } from '@tanstack/react-router';
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
  IdcardOutlined,
  PoweroffOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getEnterprise } from '../../data/enterprises';
import logoIconUrl from '../../assets/ledgerly-icon.svg';

const { useToken } = theme;
const { Text } = Typography;

export function TopBar() {
  const { token } = useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { enterpriseId?: string };
  const enterprise = params.enterpriseId
    ? getEnterprise(params.enterpriseId)
    : undefined;

  const settingsMenu: MenuProps['items'] = [
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
        <Button
          type="text"
          aria-label={t('common.appName')}
          style={{ height: 40, padding: '0 8px' }}
          onClick={() => void navigate({ to: '/enterprises' })}
        >
          <img
            src={logoIconUrl}
            alt={t('common.appName')}
            style={{ height: 28, display: 'block' }}
          />
        </Button>

        {enterprise && (
          <Text
            strong
            style={{
              maxWidth: '50%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {enterprise.name}
          </Text>
        )}
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
    </Layout.Header>
  );
}
