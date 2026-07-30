export const WORKSPACE_MODULES = [
  'dashboard',
  'projects',
  'calendar',
  'documents',
  'suppliers',
  'invoices',
  'products',
  'staff',
] as const;
export type WorkspaceModuleDto = (typeof WORKSPACE_MODULES)[number];
export type PermissionLevelDto = 'none' | 'view' | 'edit';
export type PermissionMatrixDto = Record<WorkspaceModuleDto, PermissionLevelDto>;
export type WorkspaceRoleDto = 'admin' | 'editor' | 'viewer' | 'custom';
export type WorkspaceMemberStatusDto = 'active' | 'invited' | 'disabled';

export interface WorkspaceMemberDto {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRoleDto;
  permissions: PermissionMatrixDto;
  status: WorkspaceMemberStatusDto;
  invitedAt: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
  auth: { image: string | null; emailVerified: boolean; createdAt: string; updatedAt: string; providers: string[]; activeSessions: number; lastSessionAt: string | null } | null;
}

export interface InviteWorkspaceMemberPayload {
  name: string;
  email: string;
  role: WorkspaceRoleDto;
  permissions: PermissionMatrixDto;
}

export interface UpdateWorkspaceMemberPayload {
  name?: string;
  role?: WorkspaceRoleDto;
  permissions?: PermissionMatrixDto;
  status?: WorkspaceMemberStatusDto;
}
