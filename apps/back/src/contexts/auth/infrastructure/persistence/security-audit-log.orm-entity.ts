import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('security_audit_logs')
export class SecurityAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 64 })
  event: string;

  @Column({ name: 'subject_id', type: 'varchar', length: 128, nullable: true })
  subjectId: string | null;

  @Column({ type: 'jsonb' })
  metadata: Record<string, string | null>;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
