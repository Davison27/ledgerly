import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('staff_document_types')
export class StaffDocumentTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 40 })
  code: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'boolean' })
  expires: boolean;

  @Column({ name: 'default_validity_months', type: 'smallint', nullable: true })
  defaultValidityMonths: number | null;

  @Column({ name: 'is_system', type: 'boolean' })
  isSystem: boolean;
}
