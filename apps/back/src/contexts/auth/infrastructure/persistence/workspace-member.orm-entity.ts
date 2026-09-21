import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('workspace_members')
@Index('UQ_workspace_members_founder', { synchronize: false })
@Index('UQ_workspace_members_email', ['email'], { unique: true })
@Index('UQ_workspace_members_google_subject', ['googleSubject'], { unique: true })
@Check('CHK_workspace_members_role', `"role" IN ('admin', 'editor', 'viewer', 'custom')`)
@Check('CHK_workspace_members_status', `"status" IN ('invited', 'active', 'disabled')`)
export class WorkspaceMemberOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ name: 'google_subject', type: 'varchar', length: 64, nullable: true })
  googleSubject: string | null;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  role: string;

  @Column({ type: 'jsonb' })
  permissions: Record<string, string>;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ name: 'is_founder', type: 'boolean', default: false })
  isFounder: boolean;

  @Column({ name: 'invited_at', type: 'timestamptz' })
  invitedAt: Date;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt: Date | null;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;
}
