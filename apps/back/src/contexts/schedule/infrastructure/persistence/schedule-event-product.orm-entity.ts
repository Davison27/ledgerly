import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('schedule_event_products')
export class ScheduleEventProductOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'integer' })
  quantity: number;
}
