import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { TaxSourceEvent } from '../../domain/tax-source-event';

@Entity('tax_source_states')
export class TaxSourceStateOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  sourceKey: string;

  @Column({ name: 'country_code', type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 160 })
  label: string;

  @Column({ type: 'varchar', length: 16 })
  format: string;

  @Column({ name: 'source_url', type: 'varchar', length: 500 })
  sourceUrl: string;

  @Column({ name: 'feed_url', type: 'varchar', length: 500 })
  feedUrl: string;

  @Column({ type: 'varchar', length: 24, default: 'never_checked' })
  status: string;

  @Column({ name: 'accepted_hash', type: 'varchar', length: 64, nullable: true })
  acceptedHash: string | null;

  @Column({ name: 'accepted_events', type: 'jsonb', default: () => "'[]'::jsonb" })
  acceptedEvents: TaxSourceEvent[];

  @Column({ name: 'observed_hash', type: 'varchar', length: 64, nullable: true })
  observedHash: string | null;

  @Column({ name: 'observed_events', type: 'jsonb', default: () => "'[]'::jsonb" })
  observedEvents: TaxSourceEvent[];

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;

  @Column({ name: 'last_successful_at', type: 'timestamptz', nullable: true })
  lastSuccessfulAt: Date | null;

  @Column({ name: 'last_source_modified_at', type: 'timestamptz', nullable: true })
  lastSourceModifiedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  etag: string | null;

  @Column({ name: 'last_modified', type: 'varchar', length: 120, nullable: true })
  lastModified: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
