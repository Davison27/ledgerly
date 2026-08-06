import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tax_deadline_occurrences')
@Index(['occurrenceKey'], { unique: true })
export class TaxDeadlineOccurrenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurrence_key', type: 'varchar', length: 240 })
  occurrenceKey: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'obligation_key', type: 'varchar', length: 80 })
  obligationKey: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 30 })
  category: string;

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

  @Column({ name: 'source_url', type: 'varchar', length: 500 })
  sourceUrl: string;

  @Column({ name: 'source_version', type: 'varchar', length: 40 })
  sourceVersion: string;
}
