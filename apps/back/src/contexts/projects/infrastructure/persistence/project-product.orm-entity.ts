import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('project_products')
export class ProjectProductOrmEntity {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'lease_expense', type: 'numeric', precision: 12, scale: 2, nullable: true })
  leaseExpense: string | null;

  @Column({ name: 'lease_expense_date', type: 'date', nullable: true })
  leaseExpenseDate: string | null;
}
