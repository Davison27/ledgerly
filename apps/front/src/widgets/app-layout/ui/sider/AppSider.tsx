import { useMemo } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Flex, Layout, Menu, Tooltip, Typography } from 'antd';
import {
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  ToolOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { companyQueries, type CompanyBrandingDto } from '@/entities/company';
import { currentReleaseVersion } from '@/entities/release-note';
import {
  hasModuleAccess,
  memberInitials,
  useWorkspaceAccess,
  workspaceMemberAvatarUrl,
  type WorkspaceModuleDto,
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
  | 'companies'
  | 'calendar'
  | 'documents'
  | 'suppliers'
  | 'equipment'
  | 'staff'
  | 'planning';

const navModule: Record<NavKey, WorkspaceModuleDto> = {
  dashboard: 'dashboard',
  companies: 'projects',
  calendar: 'calendar',
  documents: 'documents',
  suppliers: 'suppliers',
  equipment: 'equipment',
  staff: 'staff',
  planning: 'planning',
};

function getSelectedKey(pathname: string): NavKey | undefined {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/companies') || pathname.startsWith('/projects')) return 'companies';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/suppliers')) return 'suppliers';
  if (pathname.startsWith('/equipment')) return 'equipment';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/planning')) return 'planning';
  return undefined;
}

function CompanyBrand({ company, collapsed }: { company: CompanyBrandingDto; collapsed: boolean }) {
  const source = company.logo || (collapsed ? iconUrl : logoUrl);
  const alt = company.logo ? company.name : 'Ledgerly';

  return (
    <div className={styles.brand} data-collapsed={collapsed}>
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
  const { data: company = { name: '', logo: null, brandColor: null } } = useQuery(
    companyQueries.branding(),
  );
  const collapseLabel = collapsed ? t('sider.expand') : t('sider.collapse');
  const { member } = useWorkspaceAccess();
  const profileLabel = member ? `${t('common.profile')}: ${member.name}` : t('common.profile');
  const settingsItems = useSettingsMenuItems();
  const versionLinkLabel = t('releaseNotes.changelog.versionLinkLabel', {
    version: currentReleaseVersion,
  });
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
        key: 'companies' satisfies NavKey,
        icon: <ProjectOutlined />,
        label: t('nav.companies'),
        onClick: () => void navigate({ to: '/companies' }),
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
        key: 'equipment' satisfies NavKey,
        icon: <ToolOutlined />,
        label: t('nav.equipment'),
        onClick: () => void navigate({ to: '/equipment' }),
      },
      {
        key: 'staff' satisfies NavKey,
        icon: <IdcardOutlined />,
        label: t('nav.staff'),
        onClick: () => void navigate({ to: '/staff' }),
      },
      {
        key: 'planning' satisfies NavKey,
        icon: <CheckSquareOutlined />,
        label: t('nav.planning'),
        onClick: () => void navigate({ to: '/planning' }),
      },
    ],
    [t, navigate],
  ).filter((item) =>
    member ? hasModuleAccess(member.role, member.permissions, navModule[item.key as NavKey], 'view') : false,
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
          <Flex vertical gap={SPACE.md}>
            <Tooltip title={versionLinkLabel} placement={collapsed ? 'right' : 'top'}>
              <Link
                to="/changelog"
                aria-label={versionLinkLabel}
                aria-current={pathname === '/changelog' ? 'page' : undefined}
                className={styles.versionLink}
                data-collapsed={collapsed}
                data-active={pathname === '/changelog' || undefined}
              >
                <HistoryOutlined className={styles.versionIcon} aria-hidden="true" />
                {!collapsed && (
                  <span>
                    {t('releaseNotes.changelog.versionLink', { version: currentReleaseVersion })}
                  </span>
                )}
              </Link>
            </Tooltip>

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
          </Flex>
        </div>
      </Flex>
    </Layout.Sider>
  );
}
