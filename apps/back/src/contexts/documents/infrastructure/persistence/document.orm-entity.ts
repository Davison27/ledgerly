import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('documents')
export class DocumentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 16 })
  type: string;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 16 })
  status: string;
}
