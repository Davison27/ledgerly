import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('invoices')
@Index('IDX_invoices_project_issue_id', { synchronize: false })
export class InvoiceOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 10 })
  series: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer' })
  number: number;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'customer_name', length: 200 })
  customerName: string;

  @Column({ name: 'customer_tax_id', length: 40, nullable: true, type: 'varchar' })
  customerTaxId: string | null;

  @Column({ name: 'customer_address', length: 255, nullable: true, type: 'varchar' })
  customerAddress: string | null;

  @Column({ name: 'tax_base', type: 'numeric', precision: 12, scale: 2 })
  taxBase: string;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2 })
  taxRate: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2 })
  taxAmount: string;

  @Column({ name: 'irpf_rate', type: 'numeric', precision: 5, scale: 2 })
  irpfRate: string;

  @Column({ name: 'irpf_amount', type: 'numeric', precision: 12, scale: 2 })
  irpfAmount: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'pdf_ciphertext', type: 'bytea', nullable: true, select: false })
  pdfCiphertext: Buffer | null;

  @Column({ name: 'pdf_nonce', type: 'bytea', nullable: true, select: false })
  pdfNonce: Buffer | null;

  @Column({ name: 'pdf_tag', type: 'bytea', nullable: true, select: false })
  pdfTag: Buffer | null;

  @Column({ name: 'pdf_key_version', type: 'varchar', length: 10, nullable: true, select: false })
  pdfKeyVersion: string | null;

  @Column({ name: 'pdf_size', type: 'integer', nullable: true })
  pdfSize: number | null;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
