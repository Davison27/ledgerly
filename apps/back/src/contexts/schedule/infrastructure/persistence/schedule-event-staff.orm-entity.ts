import { Entity, PrimaryColumn } from 'typeorm';

@Entity('schedule_event_staff')
export class ScheduleEventStaffOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @PrimaryColumn({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;
}
