import { del, get, patch, post } from '@/shared/api/httpClient';
import type {
  InviteWorkspaceMemberPayload,
  UpdateWorkspaceMemberPayload,
  WorkspaceMemberDto,
} from './types';

export function listWorkspaceMembers(): Promise<WorkspaceMemberDto[]> {
  return get<WorkspaceMemberDto[]>('/workspace/members');
}

export function getCurrentWorkspaceMember(): Promise<WorkspaceMemberDto> {
  return get<WorkspaceMemberDto>('/auth/me');
}

export function workspaceMemberAvatarUrl(memberId: string): string {
  return `/api/workspace/members/${encodeURIComponent(memberId)}/avatar`;
}

export function inviteWorkspaceMember(
  payload: InviteWorkspaceMemberPayload,
): Promise<WorkspaceMemberDto> {
  return post<WorkspaceMemberDto>('/workspace/members', payload);
}

export function updateWorkspaceMember(
  id: string,
  payload: UpdateWorkspaceMemberPayload,
): Promise<WorkspaceMemberDto> {
  return patch<WorkspaceMemberDto>(`/workspace/members/${id}`, payload);
}

export function revokeWorkspaceMember(id: string): Promise<void> {
  return del<void>(`/workspace/members/${id}`);
}
