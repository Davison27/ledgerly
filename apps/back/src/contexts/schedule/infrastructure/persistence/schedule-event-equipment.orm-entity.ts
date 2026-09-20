import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { EquipmentOrmEntity } from '../../../equipment/infrastructure/persistence/equipment.orm-entity';
import { ScheduleEventOrmEntity } from './schedule-event.orm-entity';

@Entity('schedule_event_equipment')
@Index(['equipmentId'])
export class ScheduleEventEquipmentOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  @ForeignKey(() => ScheduleEventOrmEntity, {
    name: 'FK_schedule_event_equipment_event',
    onDelete: 'CASCADE',
  })
  eventId: string;

  @PrimaryColumn({ name: 'equipment_id', type: 'uuid' })
  @ForeignKey(() => EquipmentOrmEntity, {
    name: 'FK_schedule_event_equipment_equipment',
    onDelete: 'CASCADE',
  })
  equipmentId: string;

  @Column({ type: 'integer' })
  quantity: number;
}
