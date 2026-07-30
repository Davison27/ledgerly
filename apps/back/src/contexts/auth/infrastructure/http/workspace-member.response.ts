import { WorkspaceMember } from '../../domain/workspace-member';
import { AuthUserIdentity } from '../../domain/auth-user-directory.port';

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
  auth: { image: string | null; emailVerified: boolean; createdAt: string; updatedAt: string; providers: string[]; activeSessions: number; lastSessionAt: string | null } | null;
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
  auth: WorkspaceMemberResponseProps['auth'];

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

  static fromDomain(member: WorkspaceMember, identity?: AuthUserIdentity): WorkspaceMemberResponse {
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
      auth: identity ? { image: identity.image, emailVerified: identity.emailVerified, createdAt: identity.createdAt.toISOString(), updatedAt: identity.updatedAt.toISOString(), providers: identity.providers, activeSessions: identity.activeSessions, lastSessionAt: identity.lastSessionAt ? identity.lastSessionAt.toISOString() : null } : null,
    });
  }
}
