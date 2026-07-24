import { useMemo, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Avatar, Button, Flex, Layout, Menu, Tooltip, Typography, theme } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  ProjectOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/entities/company';
import { CompanySettingsModal } from '@/features/company-settings';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import logoUrl from '../../../assets/ledgerly-logo.svg';
import iconUrl from '../../../assets/ledgerly-icon.svg';

const { useToken } = theme;
const { Text } = Typography;

type NavKey =
  | 'dashboard'
  | 'projects'
  | 'calendar'
  | 'documents'
  | 'suppliers'
  | 'invoices'
  | 'products'
  | 'staff';

function getSelectedKey(pathname: string): NavKey | undefined {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/suppliers')) return 'suppliers';
  if (pathname.startsWith('/invoices')) return 'invoices';
  if (pathname.startsWith('/products')) return 'products';
  if (pathname.startsWith('/staff')) return 'staff';
  return undefined;
}

export function AppSider({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}) {
  const { token } = useToken();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedKey = getSelectedKey(pathname);
  const { company } = useCompany();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const companyInitial = company.name ? company.name.charAt(0).toUpperCase() : undefined;

  const items = useMemo(
    () => [
      {
        key: 'dashboard' satisfies NavKey,
        icon: <DashboardOutlined />,
        label: t('nav.dashboard'),
        onClick: () => void navigate({ to: '/dashboard' }),
      },
      {
        key: 'projects' satisfies NavKey,
        icon: <ProjectOutlined />,
        label: t('nav.projects'),
        onClick: () => void navigate({ to: '/projects' }),
      },
      {
        key: 'calendar' satisfies NavKey,
        icon: <CalendarOutlined />,
        label: t('nav.calendar'),
        onClick: () => void navigate({ to: '/calendar' }),
      },
      {
        key: 'documents' satisfies NavKey,
        icon: <FileTextOutlined />,
        label: t('nav.documents'),
        onClick: () => void navigate({ to: '/documents' }),
      },
      {
        key: 'suppliers' satisfies NavKey,
        icon: <TeamOutlined />,
        label: t('nav.suppliers'),
        onClick: () => void navigate({ to: '/suppliers' }),
      },
      {
        key: 'invoices' satisfies NavKey,
        icon: <FileDoneOutlined />,
        label: t('nav.invoices'),
        onClick: () => void navigate({ to: '/invoices' }),
      },
      {
        key: 'products' satisfies NavKey,
        icon: <ShoppingOutlined />,
        label: t('nav.products'),
        onClick: () => void navigate({ to: '/products' }),
      },
      {
        key: 'staff' satisfies NavKey,
        icon: <IdcardOutlined />,
        label: t('nav.staff'),
        onClick: () => void navigate({ to: '/staff' }),
      },
    ],
    [t, navigate],
  );

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      collapsedWidth={LAYOUT.siderCollapsedWidth}
      width={LAYOUT.siderWidth}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex
        align="center"
        style={{
          flex: 'none',
          height: LAYOUT.topbarHeight,
          padding: `0 ${SPACE.lg}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Button
          type="text"
          aria-label={t('common.appName')}
          style={{ height: 40, padding: 0 }}
          onClick={() => void navigate({ to: '/dashboard' })}
        >
          <img
            src={company.logo || (collapsed ? iconUrl : logoUrl)}
            alt={t('common.appName')}
            style={{ height: 28, display: 'block', objectFit: 'contain' }}
          />
        </Button>
      </Flex>

      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        style={{
          flex: 1,
          borderInlineEnd: 'none',
          overflow: 'auto',
          paddingBlock: SPACE.md,
        }}
      />

      <div
        style={{
          flex: 'none',
          padding: SPACE.md,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {collapsed ? (
          <Flex justify="center">
            <Tooltip title={company.name} placement="right">
              <Avatar
                shape="square"
                size={36}
                src={company.logo}
                style={{ cursor: 'pointer', background: token.colorPrimary, flex: 'none' }}
                onClick={() => setCompanyModalOpen(true)}
              >
                {companyInitial}
              </Avatar>
            </Tooltip>
          </Flex>
        ) : (
          <Flex align="center" justify="space-between" gap={SPACE.sm}>
            <Flex align="center" gap={SPACE.sm} style={{ minWidth: 0 }}>
              <Avatar
                shape="square"
                size={36}
                src={company.logo}
                style={{ background: token.colorPrimary, flex: 'none' }}
              >
                {companyInitial}
              </Avatar>
              <Text strong ellipsis style={{ minWidth: 0 }}>
                {company.name}
              </Text>
            </Flex>
            <Tooltip title={t('company.settings.title')}>
              <Button
                type="text"
                aria-label={t('company.settings.title')}
                icon={<SettingOutlined />}
                onClick={() => setCompanyModalOpen(true)}
              />
            </Tooltip>
          </Flex>
        )}
      </div>

      <CompanySettingsModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />
    </Layout.Sider>
  );
}
