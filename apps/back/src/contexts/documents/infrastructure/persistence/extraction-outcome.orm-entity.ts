import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('extraction_outcomes')
export class ExtractionOutcomeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 16 })
  source: string;

  @Column({ length: 16 })
  confidence: string;

  @Column({ name: 'corrected_fields', type: 'integer' })
  correctedFields: number;

  @Column({ name: 'issuer_name', type: 'varchar', length: 200, nullable: true })
  issuerName: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
