import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('documents')
@Index('IDX_documents_project_date_id', { synchronize: false })
@Index('IDX_documents_listing_date_id', { synchronize: false })
@Index('IDX_documents_invoice_amount', { synchronize: false })
export class DocumentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 16 })
  type: string;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 16 })
  status: string;

  @Column({ name: 'issuer_name', length: 200, nullable: true, type: 'varchar' })
  issuerName: string | null;

  @Column({ name: 'issuer_tax_id', length: 40, nullable: true, type: 'varchar' })
  issuerTaxId: string | null;

  @Column({ name: 'invoice_number', length: 80, nullable: true, type: 'varchar' })
  invoiceNumber: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'tax_base', type: 'numeric', precision: 12, scale: 2, nullable: true })
  taxBase: string | null;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, nullable: true })
  taxRate: string | null;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  taxAmount: string | null;

  @Column({ name: 'irpf_rate', type: 'numeric', precision: 5, scale: 2, nullable: true })
  irpfRate: string | null;

  @Column({ name: 'irpf_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  irpfAmount: string | null;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'file_name', length: 255, nullable: true, type: 'varchar' })
  fileName: string | null;

  @Column({ name: 'mime_type', length: 100, nullable: true, type: 'varchar' })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize: number | null;

  @Column({ name: 'content_ciphertext', type: 'bytea', nullable: true, select: false })
  contentCiphertext: Buffer | null;

  @Column({ name: 'content_nonce', type: 'bytea', nullable: true, select: false })
  contentNonce: Buffer | null;

  @Column({ name: 'content_tag', type: 'bytea', nullable: true, select: false })
  contentTag: Buffer | null;

  @Column({ name: 'content_key_version', type: 'varchar', length: 10, nullable: true, select: false })
  contentKeyVersion: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid', nullable: true })
  staffMemberId: string | null;

  @Column({ length: 16 })
  direction: string;
}
