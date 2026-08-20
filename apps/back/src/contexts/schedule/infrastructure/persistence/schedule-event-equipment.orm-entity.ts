import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('schedule_event_equipment')
export class ScheduleEventEquipmentOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @PrimaryColumn({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @Column({ type: 'integer' })
  quantity: number;
}
