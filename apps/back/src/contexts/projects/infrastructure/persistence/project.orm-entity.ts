import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 40, unique: true })
  code: string;
}
