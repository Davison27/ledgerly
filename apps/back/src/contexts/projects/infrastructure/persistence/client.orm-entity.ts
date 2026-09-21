import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('clients')
@Index('UQ_clients_tax_id', ['taxId'], { unique: true, where: '"tax_id" IS NOT NULL' })
export class ClientOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 40, nullable: true })
  taxId: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 160, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 160, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 40, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
