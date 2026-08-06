import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tax_compliance_settings')
export class TaxComplianceSettingsOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ name: 'internal_lead_days', type: 'integer', default: 7 })
  internalLeadDays: number;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
