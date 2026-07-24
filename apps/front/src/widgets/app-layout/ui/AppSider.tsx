import { useMemo, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Avatar, Button, Dropdown, Flex, Layout, Menu, Tooltip, Typography, theme } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  DownOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany, type Company } from '@/entities/company';
import { CompanySettingsModal } from '@/features/company-settings';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { useSettingsMenuItems } from '../model/useSettingsMenuItems';
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

function CompanyMark({ company, size }: { company: Company; size: number }) {
  const { token } = useToken();

  if (company.logo) {
    return (
      <div
        style={{
          width: size,
          height: size,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: token.borderRadius,
          background: token.colorFillTertiary,
          overflow: 'hidden',
        }}
      >
        <img
          src={company.logo}
          alt={company.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <Avatar shape="square" size={size} style={{ background: token.colorPrimary, flex: 'none' }}>
      {company.name ? company.name.charAt(0).toUpperCase() : undefined}
    </Avatar>
  );
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
  const collapseLabel = collapsed ? t('sider.expand') : t('sider.collapse');
  const settingsItems = useSettingsMenuItems({
    onCompanySettings: () => setCompanyModalOpen(true),
  });

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
      trigger={null}
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
        vertical={collapsed}
        align="center"
        justify={collapsed ? 'center' : 'space-between'}
        gap={collapsed ? SPACE.xs : 0}
        style={{
          flex: 'none',
          minHeight: LAYOUT.topbarHeight,
          padding: collapsed ? `${SPACE.sm}px 0` : `0 ${SPACE.lg}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div>
          <img
            src={(collapsed ? iconUrl : logoUrl)}
            alt={t('common.appName')}
            style={{ height: 28, display: 'block', objectFit: 'contain' }}
          />
        </div>

        <Tooltip title={collapseLabel} placement={collapsed ? 'right' : 'bottom'}>
          <Button
            type="text"
            aria-label={collapseLabel}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => onCollapse(!collapsed)}
          />
        </Tooltip>
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
            <Dropdown
              menu={{ items: settingsItems, style: { minWidth: 150, padding: 10 } }}
              trigger={['click']}
            >
              <Tooltip title={company.name} placement="right">
                <div style={{ cursor: 'pointer' }}>
                  <CompanyMark company={company} size={36} />
                </div>
              </Tooltip>
            </Dropdown>
          </Flex>
        ) : (
          <Dropdown
            menu={{ items: settingsItems, style: { minWidth: 150, padding: 10 } }}
            trigger={['click']}
          >
            <Flex align="center" gap={SPACE.sm} style={{ cursor: 'pointer', minWidth: 0 }}>
              <CompanyMark company={company} size={36} />
              <Flex
                align="center"
                justify="space-between"
                gap={SPACE.sm}
                style={{ flex: 1, minWidth: 0 }}
              >
                <Text strong ellipsis style={{ minWidth: 0 }}>
                  {company.name}
                </Text>
                <DownOutlined
                  style={{ fontSize: 12, color: token.colorTextTertiary, flex: 'none' }}
                />
              </Flex>
            </Flex>
          </Dropdown>
        )}
      </div>

      <CompanySettingsModal open={companyModalOpen} onClose={() => setCompanyModalOpen(false)} />
    </Layout.Sider>
  );
}
