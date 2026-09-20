import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';

@Entity('schedule_events')
@Index(['projectId'])
export class ScheduleEventOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, { name: 'FK_schedule_events_project', onDelete: 'CASCADE' })
  projectId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
