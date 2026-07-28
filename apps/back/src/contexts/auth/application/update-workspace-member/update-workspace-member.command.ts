import { WorkspaceMemberStatus } from '../../domain/workspace-member';

export interface UpdateWorkspaceMemberCommand {
  id: string;
  actingMemberId: string;
  name?: string;
  permissions?: Record<string, unknown>;
  status?: WorkspaceMemberStatus;
}
