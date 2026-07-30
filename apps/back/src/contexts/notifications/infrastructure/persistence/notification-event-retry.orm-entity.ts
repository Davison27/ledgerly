import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_event_retries')
@Index(['dedupeKey'], { unique: true })
export class NotificationEventRetryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dedupe_key', length: 512 })
  dedupeKey: string;

  @Column({ name: 'event_name', length: 80 })
  eventName: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz' })
  nextAttemptAt: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
