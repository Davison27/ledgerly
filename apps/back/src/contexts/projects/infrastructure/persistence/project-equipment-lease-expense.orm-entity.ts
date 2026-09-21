import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { EquipmentOrmEntity } from '../../../equipment/infrastructure/persistence/equipment.orm-entity';
import { ProjectOrmEntity } from './project.orm-entity';

@Entity('project_equipment_lease_expenses')
@Index('IDX_project_equipment_lease_expenses_project', ['projectId'])
@Index('IDX_project_equipment_lease_expenses_equipment', ['equipmentId'])
export class ProjectEquipmentLeaseExpenseOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, {
    name: 'FK_project_equipment_lease_expenses_project',
    onDelete: 'RESTRICT',
  })
  projectId: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  @ForeignKey(() => EquipmentOrmEntity, {
    name: 'FK_project_equipment_lease_expenses_equipment',
    onDelete: 'RESTRICT',
  })
  equipmentId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;
}
