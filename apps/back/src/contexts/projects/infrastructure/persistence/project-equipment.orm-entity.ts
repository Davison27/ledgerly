import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('project_equipment')
export class ProjectEquipmentOrmEntity {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @PrimaryColumn({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @Column({ name: 'lease_expense', type: 'numeric', precision: 12, scale: 2, nullable: true })
  leaseExpense: string | null;

  @Column({ name: 'lease_expense_date', type: 'date', nullable: true })
  leaseExpenseDate: string | null;
}
