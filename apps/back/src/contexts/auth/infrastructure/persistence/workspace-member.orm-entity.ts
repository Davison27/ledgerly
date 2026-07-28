import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('workspace_members')
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
