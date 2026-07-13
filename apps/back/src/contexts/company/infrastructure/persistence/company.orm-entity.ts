import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('companies')
export class CompanyOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 120 })
  sector: string;

  @Column({ type: 'varchar', length: 7 })
  color: string;
}
