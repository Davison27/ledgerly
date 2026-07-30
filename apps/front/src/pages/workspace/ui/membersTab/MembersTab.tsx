import { useTranslation } from 'react-i18next';
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Dropdown,
  Flex,
  Input,
  Segmented,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tooltip,
  Typography,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  MoreOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import {
  MemberStatusTag,
  RoleTag,
  countAccess,
  memberInitials,
  moduleSupportsEdit,
  WORKSPACE_MODULES,
  type WorkspaceMemberDto,
} from '@/entities/workspace-member';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { formatRelativeTime } from '@/shared/lib/dates';
import typography from '@/shared/ui/typography.module.css';
import { useMembersPanel, type MembersRoleFilter, type MembersStatusFilter } from '../../model/useMembersPanel';
import { MemberDrawer } from '../memberDrawer/MemberDrawer';
import workspace from '../workspace.module.css';
import styles from './MembersTab.module.css';

const { Title, Text } = Typography;

const EDITABLE_MODULE_COUNT = WORKSPACE_MODULES.filter(moduleSupportsEdit).length;

function AccessCell({ member }: { member: WorkspaceMemberDto }) {
  const { t } = useTranslation();
  const counts = countAccess(member.permissions);
  const summary =
    counts.none === 0 && counts.edit === EDITABLE_MODULE_COUNT
      ? t('workspace.members.accessFull')
      : counts.edit === 0 && counts.view === 0
        ? t('workspace.members.accessNone')
        : t('workspace.members.accessSummary', { edit: counts.edit, view: counts.view });

  return (
    <Tooltip
      title={
        <Flex vertical gap={2}>
          {WORKSPACE_MODULES.map((module) => (
            <Flex key={module} justify="space-between" gap={12}>
              <span>{t(`nav.${module}`)}</span>
              <span>{t(`workspace.permissions.levels.${member.permissions[module]}`)}</span>
            </Flex>
          ))}
        </Flex>
      }
    >
      <span>{summary}</span>
    </Tooltip>
  );
}

export function MembersTab() {
  const { t, i18n } = useTranslation();
  const { modal } = App.useApp();
  const {
    loading,
    loadError,
    filtered,
    noFiltersApplied,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    stats,
    drawer,
    openInvite,
    openEdit,
    closeDrawer,
    submitting,
    busyId,
    isSelf,
    canRevoke,
    canEditAccess,
    revokeBlockReason,
    invite,
    saveAccess,
    toggleEnabled,
    revoke,
    refetch,
  } = useMembersPanel();

  const roleFilterOptions: { value: MembersRoleFilter; label: string }[] = [
    { value: 'all', label: t('workspace.members.filters.allRoles') },
    { value: 'admin', label: t('workspace.roles.admin.name') },
    { value: 'editor', label: t('workspace.roles.editor.name') },
    { value: 'viewer', label: t('workspace.roles.viewer.name') },
    { value: 'custom', label: t('workspace.roles.custom.name') },
  ];

  const statusFilterOptions: { value: MembersStatusFilter; label: string }[] = [
    { value: 'all', label: t('workspace.members.filters.all') },
    { value: 'active', label: t('workspace.members.filters.active') },
    { value: 'invited', label: t('workspace.members.filters.invited') },
  ];

  const confirmDisable = (member: WorkspaceMemberDto) => {
    modal.confirm({
      title: t('workspace.members.confirm.disable.title', { name: member.name }),
      content: t('workspace.members.confirm.disable.description'),
      okText: t('workspace.members.confirm.disable.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => toggleEnabled(member),
    });
  };

  const confirmRevoke = (member: WorkspaceMemberDto) => {
    modal.confirm({
      title: t('workspace.members.confirm.revoke.title', { name: member.name }),
      content: t('workspace.members.confirm.revoke.description'),
      okText: t('workspace.members.confirm.revoke.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => revoke(member),
    });
  };

  const buildActionItems = (member: WorkspaceMemberDto): MenuProps['items'] => {
    const editAllowed = canEditAccess(member);
    const revokeAllowed = canRevoke(member);
    const revokeReason = revokeBlockReason(member);

    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        disabled: !editAllowed,
        label: editAllowed ? (
          t('workspace.members.actions.edit')
        ) : (
          <Tooltip title={t('workspace.members.guard.self')}>
            <span>{t('workspace.members.actions.edit')}</span>
          </Tooltip>
        ),
        onClick: editAllowed ? () => openEdit(member) : undefined,
      },
    ];

    if (member.status === 'disabled') {
      items.push({
        key: 'enable',
        icon: <CheckCircleOutlined />,
        label: t('workspace.members.actions.enable'),
        onClick: () => void toggleEnabled(member),
      });
    } else {
      items.push({
        key: 'disable',
        danger: true,
        icon: <StopOutlined />,
        label: t('workspace.members.actions.disable'),
        onClick: () => confirmDisable(member),
      });
    }

    items.push({
      key: 'revoke',
      danger: true,
      icon: <UserDeleteOutlined />,
      disabled: !revokeAllowed,
      label: revokeAllowed ? (
        t('workspace.members.actions.revoke')
      ) : (
        <Tooltip
          title={t(
            revokeReason === 'lastAdmin' ? 'workspace.members.guard.lastAdmin' : 'workspace.members.guard.self',
          )}
        >
          <span>{t('workspace.members.actions.revoke')}</span>
        </Tooltip>
      ),
      onClick: revokeAllowed ? () => confirmRevoke(member) : undefined,
    });

    return items;
  };

  const columns: TableColumnsType<WorkspaceMemberDto> = [
    {
      title: t('workspace.members.columns.member'),
      key: 'member',
      render: (_, record) => (
        <Flex align="center" gap={12}>
          <Avatar size={36} src={record.auth?.image}>{memberInitials(record.name)}</Avatar>
          <Flex vertical gap={0}>
            <Flex align="center" gap={8}>
              <Text strong>{record.name}</Text>
              {isSelf(record) && <SemanticTag tone="info">{t('workspace.members.you')}</SemanticTag>}
            </Flex>
            <Text type="secondary" className={typography.caption}>
              {record.email}
            </Text>
            <Text type="secondary" className={typography.caption}>
              {record.auth
                ? `${record.auth.emailVerified ? '✓' : '!' } ${record.auth.providers.join(', ') || 'email'} · ${record.auth.activeSessions} sesiones`
                : 'Sin cuenta Better Auth'}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: t('workspace.members.columns.role'),
      key: 'role',
      render: (_, record) => <RoleTag role={record.role} />,
    },
    {
      title: t('workspace.members.columns.access'),
      key: 'access',
      responsive: ['md'],
      render: (_, record) => <AccessCell member={record} />,
    },
    {
      title: t('workspace.members.columns.status'),
      key: 'status',
      render: (_, record) => <MemberStatusTag status={record.status} />,
    },
    {
      title: t('workspace.members.columns.lastActive'),
      key: 'lastActive',
      responsive: ['lg'],
      render: (_, record) =>
        record.lastActiveAt
          ? formatRelativeTime(new Date(record.lastActiveAt), i18n.language)
          : t('workspace.members.neverActive'),
    },
    {
      title: 'Identidad',
      key: 'identity',
      responsive: ['xl'],
      render: (_, record) =>
        record.auth ? (
          <Tooltip title={`Creada: ${new Date(record.auth.createdAt).toLocaleString(i18n.language)}`}>
            <span>{record.auth.emailVerified ? 'Verificada' : 'Sin verificar'} · {record.auth.activeSessions} sesiones</span>
          </Tooltip>
        ) : (
          <span>Sin cuenta</span>
        ),
    },
    {
      key: 'actions',
      width: 56,
      align: 'center',
      render: (_, record) => (
        <Dropdown menu={{ items: buildActionItems(record) }} trigger={['click']} placement="bottomRight">
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label={t('common.actions')}
            loading={busyId === record.id}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className={workspace.tabBody}>
      <div>
        <Title level={4}>{t('workspace.members.title')}</Title>
        <Text type="secondary">{t('workspace.members.subtitle')}</Text>
      </div>

      <div className={workspace.statStrip}>
        <Card size="small" className={styles.statCard}>
          <Statistic title={t('workspace.members.stats.active')} value={stats.activeCount} />
        </Card>
        <Card size="small" className={styles.statCard}>
          <Statistic title={t('workspace.members.stats.pending')} value={stats.pendingCount} />
        </Card>
        <Card size="small" className={styles.statCard}>
          <Statistic title={t('workspace.members.stats.admins')} value={stats.adminCount} />
        </Card>
      </div>

      <div className={workspace.toolbar}>
        <Input.Search
          allowClear
          placeholder={t('workspace.members.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.searchInput}
        />
        <Select<MembersRoleFilter>
          value={roleFilter}
          onChange={setRoleFilter}
          options={roleFilterOptions}
          className={styles.roleFilter}
        />
        <Segmented<MembersStatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusFilterOptions}
        />
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={openInvite}
          className={styles.inviteButton}
        >
          {t('workspace.members.invite')}
        </Button>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          message={t('workspace.members.loadError')}
          action={
            <Button size="small" onClick={refetch}>
              {t('workspace.members.retry')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        noFiltersApplied ? (
          <EmptyHint
            icon={<TeamOutlined />}
            title={t('workspace.members.empty')}
            hint={t('workspace.members.emptyHint')}
            action={
              <Button type="primary" icon={<UserAddOutlined />} onClick={openInvite}>
                {t('workspace.members.invite')}
              </Button>
            }
          />
        ) : (
          <EmptyHint
            icon={<TeamOutlined />}
            title={t('workspace.members.noResults')}
            hint={t('workspace.members.noResultsHint')}
          />
        )
      ) : (
        <Table<WorkspaceMemberDto>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={false}
          scroll={{ x: 880 }}
        />
      )}

      <MemberDrawer
        drawer={drawer}
        submitting={submitting}
        onClose={closeDrawer}
        onInvite={invite}
        onSave={saveAccess}
      />
    </div>
  );
}
