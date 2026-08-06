import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('tax_client_profiles')
@Index(['projectId'], { unique: true })
export class TaxClientProfileOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'country_code', type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ name: 'region_code', type: 'varchar', length: 20, nullable: true })
  regionCode: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType: string;

  @Column({ name: 'fiscal_year_start_month', type: 'smallint', default: 1 })
  fiscalYearStartMonth: number;

  @Column({ type: 'varchar', length: 64, default: 'Europe/Madrid' })
  timezone: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'obligation_keys', type: 'jsonb', default: () => "'[]'::jsonb" })
  obligationKeys: string[];
}
