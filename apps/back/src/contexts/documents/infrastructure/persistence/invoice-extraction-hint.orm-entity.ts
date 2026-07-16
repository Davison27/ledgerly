import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoice_extraction_hints')
export class InvoiceExtractionHintOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'issuer_name', length: 200 })
  issuerName: string;

  @Column({ length: 32 })
  field: string;

  @Column({ name: 'anchor_kind', length: 16 })
  anchorKind: string;

  @Column({ name: 'anchor_label', length: 200 })
  anchorLabel: string;

  @Column({ name: 'line_offset', type: 'integer', default: 0 })
  lineOffset: number;

  @Column({ name: 'sample_value', type: 'text' })
  sampleValue: string;

  @Column({ type: 'integer', default: 1 })
  occurrences: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
