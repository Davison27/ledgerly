import { WorkspaceMemberStatus } from '../../domain/workspace-member';
import { WorkspaceRole } from '../../domain/value-objects/permission-matrix';

export interface UpdateWorkspaceMemberCommand {
  id: string;
  actingMemberId: string;
  name?: string;
  role?: WorkspaceRole;
  permissions?: Record<string, unknown>;
  status?: WorkspaceMemberStatus;
}
