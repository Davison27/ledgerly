import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { GoogleIdentityRejectedException } from './errors/google-identity-rejected.exception';
import { MemberEmail } from './value-objects/member-email';
import { PermissionLevel, PermissionMatrix, WorkspaceModule, WorkspaceRole } from './value-objects/permission-matrix';

export type WorkspaceMemberStatus = 'invited' | 'active' | 'disabled';

interface WorkspaceMemberProps {
  id: string;
  email: MemberEmail;
  googleSubject: string | null;
  name: string;
  permissions: PermissionMatrix;
  status: WorkspaceMemberStatus;
  isFounder: boolean;
  invitedAt: Date;
  joinedAt: Date | null;
  lastActiveAt: Date | null;
}

export class WorkspaceMember {
  private constructor(private readonly props: WorkspaceMemberProps) {}

  static create(props: {
    id: string;
    email: MemberEmail;
    googleSubject?: string | null;
    name: string;
    permissions: PermissionMatrix;
    status?: WorkspaceMemberStatus;
    isFounder?: boolean;
    invitedAt: Date;
    joinedAt?: Date | null;
    lastActiveAt?: Date | null;
  }): WorkspaceMember {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new InvalidValueException('name must not be empty');
    }

    return new WorkspaceMember({
      id: props.id,
      email: props.email,
      googleSubject: props.googleSubject ?? null,
      name,
      permissions: props.permissions,
      status: props.status ?? 'invited',
      isFounder: props.isFounder ?? false,
      invitedAt: props.invitedAt,
      joinedAt: props.joinedAt ?? null,
      lastActiveAt: props.lastActiveAt ?? null,
    });
  }

  static fromPrimitives(props: {
    id: string;
    email: string;
    googleSubject: string | null;
    name: string;
    permissions: Record<string, unknown>;
    status: WorkspaceMemberStatus;
    isFounder: boolean;
    invitedAt: Date;
    joinedAt: Date | null;
    lastActiveAt: Date | null;
  }): WorkspaceMember {
    return WorkspaceMember.create({
      id: props.id,
      email: MemberEmail.create(props.email),
      googleSubject: props.googleSubject,
      name: props.name,
      permissions: PermissionMatrix.create(props.permissions),
      status: props.status,
      isFounder: props.isFounder,
      invitedAt: props.invitedAt,
      joinedAt: props.joinedAt,
      lastActiveAt: props.lastActiveAt,
    });
  }

  getId(): string {
    return this.props.id;
  }

  getEmail(): string {
    return this.props.email.toValue();
  }

  getGoogleSubject(): string | null {
    return this.props.googleSubject;
  }

  getName(): string {
    return this.props.name;
  }

  getPermissions(): PermissionMatrix {
    return this.props.permissions;
  }

  getRole(): WorkspaceRole {
    return this.props.permissions.deriveRole();
  }

  getStatus(): WorkspaceMemberStatus {
    return this.props.status;
  }

  isFounder(): boolean {
    return this.props.isFounder;
  }

  getInvitedAt(): Date {
    return this.props.invitedAt;
  }

  getJoinedAt(): Date | null {
    return this.props.joinedAt;
  }

  getLastActiveAt(): Date | null {
    return this.props.lastActiveAt;
  }

  canAccess(module: WorkspaceModule, level: PermissionLevel): boolean {
    return this.props.permissions.allows(module, level);
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  isDisabled(): boolean {
    return this.props.status === 'disabled';
  }

  rename(name: string): void {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueException('name must not be empty');
    }

    this.props.name = trimmed;
  }

  changePermissions(permissions: PermissionMatrix): void {
    this.props.permissions = permissions;
  }

  changeStatus(status: WorkspaceMemberStatus): void {
    this.props.status = status;
  }

  bindGoogleAccount(subject: string, name: string, at: Date): void {
    if (this.isDisabled()) {
      throw new GoogleIdentityRejectedException('workspace member is disabled');
    }

    if (this.props.googleSubject !== null && this.props.googleSubject !== subject) {
      throw new GoogleIdentityRejectedException('google subject does not match the bound account');
    }

    if (this.props.googleSubject === null) {
      this.props.googleSubject = subject;
    }

    this.props.name = name;

    if (this.props.status === 'invited') {
      this.props.status = 'active';
      this.props.joinedAt = at;
    }
  }

  toPrimitives(): {
    id: string;
    email: string;
    googleSubject: string | null;
    name: string;
    role: WorkspaceRole;
    permissions: Record<string, unknown>;
    status: WorkspaceMemberStatus;
    isFounder: boolean;
    invitedAt: Date;
    joinedAt: Date | null;
    lastActiveAt: Date | null;
  } {
    return {
      id: this.props.id,
      email: this.getEmail(),
      googleSubject: this.props.googleSubject,
      name: this.props.name,
      role: this.getRole(),
      permissions: this.props.permissions.toPrimitives(),
      status: this.props.status,
      isFounder: this.props.isFounder,
      invitedAt: this.props.invitedAt,
      joinedAt: this.props.joinedAt,
      lastActiveAt: this.props.lastActiveAt,
    };
  }
}
