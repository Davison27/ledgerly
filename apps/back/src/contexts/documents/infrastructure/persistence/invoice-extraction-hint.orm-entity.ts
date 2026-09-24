import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('invoice_extraction_hints')
@Index('UQ_invoice_extraction_hints_issuer_field', ['issuerName', 'field'], { unique: true })
@Index('UQ_invoice_extraction_hints_tax_id_field', ['issuerTaxId', 'field'], {
  unique: true,
  where: '"issuer_tax_id" IS NOT NULL',
})
export class InvoiceExtractionHintOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'issuer_name', length: 200 })
  issuerName: string;

  @Column({ name: 'issuer_tax_id', type: 'varchar', length: 40, nullable: true })
  issuerTaxId: string | null;

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

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
