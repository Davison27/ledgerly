import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('staff_documents')
@Index('IDX_staff_documents_member_issue_id', { synchronize: false })
export class StaffDocumentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @Column({ name: 'type_id', type: 'uuid' })
  typeId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'content_ciphertext', type: 'bytea', nullable: true, select: false })
  contentCiphertext: Buffer | null;

  @Column({ name: 'content_nonce', type: 'bytea', nullable: true, select: false })
  contentNonce: Buffer | null;

  @Column({ name: 'content_tag', type: 'bytea', nullable: true, select: false })
  contentTag: Buffer | null;

  @Column({ name: 'content_key_version', type: 'varchar', length: 10, nullable: true, select: false })
  contentKeyVersion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
