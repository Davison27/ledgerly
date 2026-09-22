import { useQuery } from '@tanstack/react-query';
import type { PermissionLevelDto, WorkspaceModuleDto } from '../api/types';
import { workspaceMemberQueries } from '../api/workspaceMember.queries';
import { hasModuleAccess } from './permissions';

export function useWorkspaceAccess() {
  const { data: member, isPending } = useQuery(workspaceMemberQueries.current());

  const canAccess = (module: WorkspaceModuleDto, level: PermissionLevelDto): boolean => {
    if (!member) return false;

    return hasModuleAccess(member.role, member.permissions, module, level);
  };

  return {
    member,
    isPending,
    isAdmin: member?.role === 'admin',
    canAccess,
  };
}
