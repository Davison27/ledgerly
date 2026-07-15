import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 40, unique: true })
  code: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'client_company', type: 'varchar', length: 160, nullable: true })
  clientCompany: string | null;

  @Column({ name: 'client_tax_id', type: 'varchar', length: 40, nullable: true })
  clientTaxId: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 160, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 160, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 40, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  budget: string | null;

  @Column({ length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'fiscal_year', type: 'varchar', length: 10, nullable: true })
  fiscalYear: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  manager: string | null;
}
