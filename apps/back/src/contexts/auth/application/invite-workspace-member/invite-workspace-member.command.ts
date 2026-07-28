export interface InviteWorkspaceMemberCommand {
  name: string;
  email: string;
  permissions: Record<string, unknown>;
}
