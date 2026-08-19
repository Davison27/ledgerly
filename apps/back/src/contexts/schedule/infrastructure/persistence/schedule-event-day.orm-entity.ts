import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('schedule_event_days')
@Index('IDX_schedule_event_days_date_event', { synchronize: false })
export class ScheduleEventDayOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;
}
