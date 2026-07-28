import type { SemanticTone } from '@/shared/ui/SemanticTag';
import type { WorkspaceMemberStatusDto, WorkspaceRoleDto } from '../api/types';

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

export const MEMBER_STATUS_TONE: Record<WorkspaceMemberStatusDto, SemanticTone> = {
  active: 'income',
  invited: 'pending',
  disabled: 'neutral',
};

export const ROLE_TONE: Record<WorkspaceRoleDto, SemanticTone> = {
  admin: 'info',
  editor: 'neutral',
  viewer: 'neutral',
  custom: 'pending',
};
