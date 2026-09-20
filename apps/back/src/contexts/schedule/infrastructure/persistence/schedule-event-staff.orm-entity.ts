import { Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { StaffMemberOrmEntity } from '../../../staff/infrastructure/persistence/staff-member.orm-entity';
import { ScheduleEventOrmEntity } from './schedule-event.orm-entity';

@Entity('schedule_event_staff')
@Index(['staffMemberId'])
export class ScheduleEventStaffOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  @ForeignKey(() => ScheduleEventOrmEntity, { name: 'FK_schedule_event_staff_event', onDelete: 'CASCADE' })
  eventId: string;

  @PrimaryColumn({ name: 'staff_member_id', type: 'uuid' })
  @ForeignKey(() => StaffMemberOrmEntity, {
    name: 'FK_schedule_event_staff_staff_member',
    onDelete: 'CASCADE',
  })
  staffMemberId: string;
}
