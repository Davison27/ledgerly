import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';

@Entity('tax_deadline_occurrences')
@Index('UQ_tax_deadline_occurrences_natural', ['projectId', 'obligationKey', 'periodStart', 'periodEnd'], { unique: true })
@Index('IDX_tax_deadline_due_project', { synchronize: false })
@Index(['projectId'])
@Check(
  'CHK_tax_deadline_occurrences_status',
  `"status" IN ('pending', 'in_progress', 'submitted', 'paid', 'dismissed')`,
)
export class TaxDeadlineOccurrenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, { name: 'FK_tax_deadline_occurrences_project', onDelete: 'CASCADE' })
  projectId: string;

  @Column({ name: 'obligation_key', type: 'varchar', length: 80 })
  obligationKey: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;
}
