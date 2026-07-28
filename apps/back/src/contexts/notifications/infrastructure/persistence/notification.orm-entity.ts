import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('notifications')
export class NotificationOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'dedupe_key', length: 200 })
  dedupeKey: string;

  @Column({ length: 48 })
  type: string;

  @Column({ length: 16 })
  severity: string;

  @Column({ length: 200 })
  subject: string;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  related: string | null;

  @Column({ name: 'context_date', type: 'date', nullable: true })
  contextDate: string | null;

  @Column({ name: 'context_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  contextAmount: string | null;

  @Column({ name: 'context_conflict_kind', length: 32, nullable: true, type: 'varchar' })
  contextConflictKind: string | null;

  @Column({ name: 'resource_kind', length: 24 })
  resourceKind: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ name: 'resource_project_id', type: 'uuid', nullable: true })
  resourceProjectId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;
}
