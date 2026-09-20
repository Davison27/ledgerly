import { Check, Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { EquipmentOrmEntity } from './equipment.orm-entity';

@Entity('equipment_documents')
@Index('IDX_equipment_documents_equipment_issue_id', { synchronize: false })
@Check(
  'CHK_equipment_documents_content_envelope',
  '("content_ciphertext" IS NULL AND "content_nonce" IS NULL AND "content_tag" IS NULL AND "content_key_version" IS NULL) OR ("content_ciphertext" IS NOT NULL AND "content_nonce" IS NOT NULL AND "content_tag" IS NOT NULL AND "content_key_version" IS NOT NULL)',
)
@Check(
  'CHK_equipment_documents_content_bounds',
  '"content_ciphertext" IS NULL OR (octet_length("content_nonce") = 12 AND octet_length("content_tag") = 16 AND "content_key_version" ~ \'^v[1-9][0-9]{0,8}$\' AND "file_size" IS NOT NULL AND "file_size" >= 0 AND "file_size" <= 10485760 AND octet_length("content_ciphertext") = "file_size" AND "mime_type" IS NOT NULL AND octet_length("mime_type") <= 127)',
)
@Check('CHK_equipment_documents_content_metadata_size', '"file_size" IS NULL OR ("file_size" >= 0 AND "file_size" <= 10485760)')
export class EquipmentDocumentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  @ForeignKey(() => EquipmentOrmEntity, { name: 'FK_equipment_documents_equipment', onDelete: 'CASCADE' })
  equipmentId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: string | null;

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
