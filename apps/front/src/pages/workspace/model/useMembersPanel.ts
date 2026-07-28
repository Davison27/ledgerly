import { useMemo, useState } from 'react';
import type { FormInstance } from 'antd';
import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/shared/api/httpClient';
import {
  inviteWorkspaceMember,
  revokeWorkspaceMember,
  updateWorkspaceMember,
  workspaceMemberQueries,
  type InviteWorkspaceMemberPayload,
  type PermissionMatrixDto,
  type WorkspaceMemberDto,
  type WorkspaceRoleDto,
} from '@/entities/workspace-member';

export type MembersRoleFilter = WorkspaceRoleDto | 'all';
export type MembersStatusFilter = 'all' | 'active' | 'invited';
export type MembersGuardReason = 'self' | 'lastAdmin' | null;

export type MembersDrawerState =
  | { mode: 'invite' }
  | { mode: 'edit'; member: WorkspaceMemberDto }
  | null;

export interface MemberFormValues {
  name: string;
  email: string;
}

export interface MembersStats {
  activeCount: number;
  pendingCount: number;
  adminCount: number;
}

export interface UseMembersPanelResult {
  members: WorkspaceMemberDto[];
  current: WorkspaceMemberDto | undefined;
  loading: boolean;
  loadError: boolean;
  filtered: WorkspaceMemberDto[];
  noFiltersApplied: boolean;
  search: string;
  setSearch: (value: string) => void;
  roleFilter: MembersRoleFilter;
  setRoleFilter: (value: MembersRoleFilter) => void;
  statusFilter: MembersStatusFilter;
  setStatusFilter: (value: MembersStatusFilter) => void;
  stats: MembersStats;
  drawer: MembersDrawerState;
  openInvite: () => void;
  openEdit: (member: WorkspaceMemberDto) => void;
  closeDrawer: () => void;
  submitting: boolean;
  busyId: string | null;
  isSelf: (member: WorkspaceMemberDto) => boolean;
  canRevoke: (member: WorkspaceMemberDto) => boolean;
  canEditAccess: (member: WorkspaceMemberDto) => boolean;
  revokeBlockReason: (member: WorkspaceMemberDto) => MembersGuardReason;
  invite: (
    values: MemberFormValues,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
    form: FormInstance<MemberFormValues>,
  ) => Promise<void>;
  saveAccess: (
    memberId: string,
    name: string,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
  ) => Promise<void>;
  toggleEnabled: (member: WorkspaceMemberDto) => Promise<void>;
  revoke: (member: WorkspaceMemberDto) => Promise<void>;
  refetch: () => void;
}

function matchesSearch(member: WorkspaceMemberDto, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
}

export function useMembersPanel(): UseMembersPanelResult {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const {
    data: members = [],
    isPending: loading,
    isError: loadError,
    refetch,
  } = useQuery(workspaceMemberQueries.list());
  const { data: current } = useQuery(workspaceMemberQueries.current());

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<MembersRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<MembersStatusFilter>('all');
  const [drawer, setDrawer] = useState<MembersDrawerState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const noFiltersApplied = search.trim() === '' && roleFilter === 'all' && statusFilter === 'all';

  const filtered = useMemo(
    () =>
      members.filter((member) => {
        if (roleFilter !== 'all' && member.role !== roleFilter) return false;
        if (statusFilter !== 'all' && member.status !== statusFilter) return false;
        return matchesSearch(member, search);
      }),
    [members, roleFilter, statusFilter, search],
  );

  const stats: MembersStats = useMemo(
    () => ({
      activeCount: members.filter((member) => member.status === 'active').length,
      pendingCount: members.filter((member) => member.status === 'invited').length,
      adminCount: members.filter((member) => member.role === 'admin').length,
    }),
    [members],
  );

  const isSelf = (member: WorkspaceMemberDto) => member.id === current?.id;

  const revokeBlockReason = (member: WorkspaceMemberDto): MembersGuardReason => {
    if (isSelf(member)) return 'self';
    if (member.role === 'admin' && stats.adminCount <= 1) return 'lastAdmin';
    return null;
  };

  const canRevoke = (member: WorkspaceMemberDto) => revokeBlockReason(member) === null;
  const canEditAccess = (member: WorkspaceMemberDto) => !isSelf(member);

  const openInvite = () => setDrawer({ mode: 'invite' });
  const openEdit = (member: WorkspaceMemberDto) => setDrawer({ mode: 'edit', member });
  const closeDrawer = () => setDrawer(null);

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: workspaceMemberQueries.all });

  const guardErrorMessage = (error: unknown): string | null => {
    if (!(error instanceof ApiError) || error.status !== 422) return null;
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code === 'SELF_ACCESS_CHANGE') return t('workspace.members.guard.self');
    if (code === 'LAST_ADMIN') return t('workspace.members.guard.lastAdmin');
    return null;
  };

  const invite = async (
    values: MemberFormValues,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
    form: FormInstance<MemberFormValues>,
  ) => {
    const payload: InviteWorkspaceMemberPayload = { ...values, role, permissions };
    setSubmitting(true);
    try {
      await inviteWorkspaceMember(payload);
      await invalidateMembers();
      void message.success(t('workspace.members.toast.invited', { email: payload.email }));
      closeDrawer();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        form.setFields([
          { name: 'email', errors: [t('workspace.memberDrawer.validation.emailTaken')] },
        ]);
      } else {
        void message.error(t('workspace.members.toast.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveAccess = async (
    memberId: string,
    name: string,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
  ) => {
    setSubmitting(true);
    try {
      await updateWorkspaceMember(memberId, { name, role, permissions });
      await invalidateMembers();
      void message.success(t('workspace.members.toast.updated'));
      closeDrawer();
    } catch (error) {
      void message.error(guardErrorMessage(error) ?? t('workspace.members.toast.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (member: WorkspaceMemberDto) => {
    const nextStatus = member.status === 'disabled' ? 'active' : 'disabled';
    setBusyId(member.id);
    try {
      await updateWorkspaceMember(member.id, { status: nextStatus });
      await invalidateMembers();
      void message.success(
        t(nextStatus === 'disabled' ? 'workspace.members.toast.disabled' : 'workspace.members.toast.enabled'),
      );
    } catch (error) {
      void message.error(guardErrorMessage(error) ?? t('workspace.members.toast.error'));
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (member: WorkspaceMemberDto) => {
    setBusyId(member.id);
    try {
      await revokeWorkspaceMember(member.id);
      await invalidateMembers();
      void message.success(t('workspace.members.toast.revoked'));
    } catch (error) {
      void message.error(guardErrorMessage(error) ?? t('workspace.members.toast.error'));
    } finally {
      setBusyId(null);
    }
  };

  return {
    members,
    current,
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
    refetch: () => void refetch(),
  };
}
