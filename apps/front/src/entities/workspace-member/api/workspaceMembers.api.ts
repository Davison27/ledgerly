import { fakeLatency } from '@/shared/lib/fakeLatency';
import {
  findMember,
  findMemberByEmail,
  insertMember,
  membersStore,
  patchMember,
  removeMember,
} from './workspaceMembers.fixtures';
import type {
  InviteWorkspaceMemberPayload,
  UpdateWorkspaceMemberPayload,
  WorkspaceMemberDto,
} from './types';

const CURRENT_MEMBER_ID = 'wm-1';

function cloneMember(member: WorkspaceMemberDto): WorkspaceMemberDto {
  return { ...member, permissions: { ...member.permissions } };
}

export function listWorkspaceMembers(): Promise<WorkspaceMemberDto[]> {
  return fakeLatency(membersStore().map(cloneMember));
}

export function getCurrentWorkspaceMember(): Promise<WorkspaceMemberDto> {
  const current = findMember(CURRENT_MEMBER_ID);
  if (!current) throw new Error('current_member_missing');
  return fakeLatency(cloneMember(current));
}

export function inviteWorkspaceMember(payload: InviteWorkspaceMemberPayload): Promise<WorkspaceMemberDto> {
  if (findMemberByEmail(payload.email)) {
    return Promise.reject(new Error('email_taken'));
  }

  const member: WorkspaceMemberDto = {
    id: `wm-${crypto.randomUUID()}`,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
    status: 'invited',
    invitedAt: new Date().toISOString(),
    joinedAt: null,
    lastActiveAt: null,
  };
  insertMember(member);
  return fakeLatency(cloneMember(member));
}

export function updateWorkspaceMember(
  id: string,
  payload: UpdateWorkspaceMemberPayload,
): Promise<WorkspaceMemberDto> {
  return fakeLatency(cloneMember(patchMember(id, payload)));
}

export function resendWorkspaceInvitation(id: string): Promise<WorkspaceMemberDto> {
  return fakeLatency(cloneMember(patchMember(id, { invitedAt: new Date().toISOString() })));
}

export function revokeWorkspaceMember(id: string): Promise<void> {
  removeMember(id);
  return fakeLatency(undefined);
}
