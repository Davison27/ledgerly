import { WorkspaceRole } from '../../domain/value-objects/permission-matrix';

export interface InviteWorkspaceMemberCommand {
  name: string;
  email: string;
  role: WorkspaceRole;
  permissions: Record<string, unknown>;
}
