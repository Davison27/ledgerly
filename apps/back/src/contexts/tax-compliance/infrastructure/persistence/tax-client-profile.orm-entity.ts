import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { ProjectOrmEntity } from '../../../projects/infrastructure/persistence/project.orm-entity';

@Entity('tax_client_profiles')
@Index(['projectId'], { unique: true })
export class TaxClientProfileOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, { name: 'FK_tax_client_profiles_project', onDelete: 'CASCADE' })
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

  @Column({ name: 'obligation_keys', type: 'jsonb', default: () => "'[]'" })
  obligationKeys: string[];
}
