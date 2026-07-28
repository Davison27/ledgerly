import { WorkspaceMember } from '../../domain/workspace-member';

interface WorkspaceMemberResponseProps {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, unknown>;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
}

export class WorkspaceMemberResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, unknown>;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
  lastActiveAt: string | null;

  private constructor(props: WorkspaceMemberResponseProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.permissions = props.permissions;
    this.status = props.status;
    this.invitedAt = props.invitedAt;
    this.joinedAt = props.joinedAt;
    this.lastActiveAt = props.lastActiveAt;
  }

  static fromDomain(member: WorkspaceMember): WorkspaceMemberResponse {
    const primitives = member.toPrimitives();

    return new WorkspaceMemberResponse({
      id: primitives.id,
      name: primitives.name,
      email: primitives.email,
      role: primitives.role,
      permissions: primitives.permissions,
      status: primitives.status,
      invitedAt: primitives.invitedAt.toISOString(),
      joinedAt: primitives.joinedAt ? primitives.joinedAt.toISOString() : null,
      lastActiveAt: primitives.lastActiveAt ? primitives.lastActiveAt.toISOString() : null,
    });
  }
}
