import { useQuery } from '@tanstack/react-query';
import type { PermissionLevelDto, WorkspaceModuleDto } from '../api/types';
import { workspaceMemberQueries } from '../api/workspaceMember.queries';

const PERMISSION_RANK: Record<PermissionLevelDto, number> = {
  none: 0,
  view: 1,
  edit: 2,
};

export function useWorkspaceAccess() {
  const { data: member, isPending } = useQuery(workspaceMemberQueries.current());

  const canAccess = (module: WorkspaceModuleDto, level: PermissionLevelDto): boolean => {
    if (!member) return false;

    return PERMISSION_RANK[member.permissions[module]] >= PERMISSION_RANK[level];
  };

  return {
    member,
    isPending,
    isAdmin: member?.role === 'admin',
    canAccess,
  };
}
