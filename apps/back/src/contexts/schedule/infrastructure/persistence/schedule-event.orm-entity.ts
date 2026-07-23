import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('schedule_events')
export class ScheduleEventOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
