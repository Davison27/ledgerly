import { queryOptions } from '@tanstack/react-query';
import { getCurrentWorkspaceMember, listWorkspaceMembers } from './workspaceMembers.api';

export const workspaceMemberQueries = {
  all: ['workspace-members'] as const,
  list: () =>
    queryOptions({
      queryKey: [...workspaceMemberQueries.all, 'list'] as const,
      queryFn: () => listWorkspaceMembers(),
    }),
  current: () =>
    queryOptions({
      queryKey: [...workspaceMemberQueries.all, 'current'] as const,
      queryFn: () => getCurrentWorkspaceMember(),
    }),
};
