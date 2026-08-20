import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('company_document_types')
@Index(['code'], { unique: true })
export class CompanyDocumentTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 80 })
  code: string;

  @Column({ length: 160 })
  name: string;

  @Column({ name: 'is_system', type: 'boolean' })
  isSystem: boolean;
}
