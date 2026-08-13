import { useMemo } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Avatar, Button, Dropdown, Flex, Layout, Menu, Tooltip, Typography } from 'antd';
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
import {
  memberInitials,
  useWorkspaceAccess,
  workspaceMemberAvatarUrl,
  type WorkspaceMemberDto,
} from '@/entities/workspace-member';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { useSettingsMenuItems } from '../../model/useSettingsMenuItems';
import logoUrl from '@/assets/ledgerly-logo.svg';
import iconUrl from '@/assets/ledgerly-icon.svg';
import styles from './AppSider.module.css';

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

function CompanyBrand({ company, collapsed }: { company: Company; collapsed: boolean }) {
  const source = company.logo || (collapsed ? iconUrl : logoUrl);
  const alt = company.logo ? company.name : 'Ledgerly';

  return (
    <div className={styles.brand} data-collapsed={collapsed} data-custom={Boolean(company.logo) || undefined}>
      <img src={source} alt={alt} className={styles.brandImage} />
    </div>
  );
}

function MemberAvatar({ member, size }: { member: WorkspaceMemberDto | undefined; size: number }) {
  return (
    <Avatar
      size={size}
      src={member ? workspaceMemberAvatarUrl(member.id) : undefined}
      alt={member?.name}
      className={styles.memberAvatar}
    >
      {member ? memberInitials(member.name) : undefined}
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedKey = getSelectedKey(pathname);
  const { company } = useCompany();
  const collapseLabel = collapsed ? t('sider.expand') : t('sider.collapse');
  const { member } = useWorkspaceAccess();
  const profileLabel = member ? `${t('common.profile')}: ${member.name}` : t('common.profile');
  const settingsItems = useSettingsMenuItems();
  const isSettingsRouteActive =
    pathname.startsWith('/workspace') || pathname.startsWith('/extraction-hints');

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
      className={styles.sider}
    >
      <Flex vertical className={styles.inner}>
        <Flex
          vertical={collapsed}
          align="center"
          justify={collapsed ? 'center' : 'space-between'}
          gap={collapsed ? SPACE.xs : 0}
          data-collapsed={collapsed}
          className={styles.header}
        >
          <CompanyBrand company={company} collapsed={collapsed} />

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
          className={styles.menu}
        />

        <div className={styles.footer}>
          {collapsed ? (
            <Flex justify="center">
              <Dropdown
                menu={{ items: settingsItems, style: { minWidth: 150, padding: 10 } }}
                trigger={['click']}
              >
                <Tooltip title={member?.name} placement="right">
                  <button
                    type="button"
                    aria-label={profileLabel}
                    className={styles.trigger}
                    data-active={isSettingsRouteActive || undefined}
                  >
                    <MemberAvatar member={member} size={36} />
                  </button>
                </Tooltip>
              </Dropdown>
            </Flex>
          ) : (
            <Dropdown
              menu={{ items: settingsItems, style: { minWidth: 150, padding: 10 } }}
              trigger={['click']}
            >
              <button
                type="button"
                aria-label={profileLabel}
                className={styles.identityRow}
                data-active={isSettingsRouteActive || undefined}
              >
                <MemberAvatar member={member} size={36} />
                <span className={styles.identityDetails}>
                  <Text strong ellipsis className={styles.identityName}>
                    {member?.name}
                  </Text>
                  <DownOutlined className={styles.chevron} />
                </span>
              </button>
            </Dropdown>
          )}
        </div>
      </Flex>
    </Layout.Sider>
  );
}
