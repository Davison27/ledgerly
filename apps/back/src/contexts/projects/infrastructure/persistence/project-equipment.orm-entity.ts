import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { EquipmentOrmEntity } from '../../../equipment/infrastructure/persistence/equipment.orm-entity';
import { ProjectOrmEntity } from './project.orm-entity';

@Entity('project_equipment')
@Index(['equipmentId'])
export class ProjectEquipmentOrmEntity {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, { name: 'FK_project_equipment_project', onDelete: 'CASCADE' })
  projectId: string;

  @PrimaryColumn({ name: 'equipment_id', type: 'uuid' })
  @ForeignKey(() => EquipmentOrmEntity, { name: 'FK_project_equipment_equipment', onDelete: 'CASCADE' })
  equipmentId: string;

  @Column({ name: 'lease_expense', type: 'numeric', precision: 12, scale: 2, nullable: true })
  leaseExpense: string | null;

  @Column({ name: 'lease_expense_date', type: 'date', nullable: true })
  leaseExpenseDate: string | null;
}
