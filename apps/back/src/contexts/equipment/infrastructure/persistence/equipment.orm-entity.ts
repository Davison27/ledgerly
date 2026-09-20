import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('equipment')
@Check(
  'CHK_equipment_image_envelope',
  '("image_ciphertext" IS NULL AND "image_nonce" IS NULL AND "image_tag" IS NULL AND "image_key_version" IS NULL AND "image_mime_type" IS NULL AND "image_size" IS NULL) OR ("image_ciphertext" IS NOT NULL AND "image_nonce" IS NOT NULL AND "image_tag" IS NOT NULL AND "image_key_version" IS NOT NULL AND "image_mime_type" IS NOT NULL AND "image_size" IS NOT NULL)',
)
@Check(
  'CHK_equipment_image_bounds',
  '"image_ciphertext" IS NULL OR (octet_length("image_nonce") = 12 AND octet_length("image_tag") = 16 AND "image_key_version" ~ \'^v[1-9][0-9]{0,8}$\' AND "image_size" IS NOT NULL AND "image_size" >= 0 AND "image_size" <= 2097152 AND octet_length("image_ciphertext") = "image_size" AND "image_mime_type" IS NOT NULL AND octet_length("image_mime_type") <= 127 AND "image_mime_type" IN (\'image/png\', \'image/jpeg\', \'image/webp\'))',
)
export class EquipmentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: string | null;

  @Column({ type: 'integer' })
  stock: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_ciphertext', type: 'bytea', nullable: true, select: false })
  imageCiphertext: Buffer | null;

  @Column({ name: 'image_nonce', type: 'bytea', nullable: true, select: false })
  imageNonce: Buffer | null;

  @Column({ name: 'image_tag', type: 'bytea', nullable: true, select: false })
  imageTag: Buffer | null;

  @Column({ name: 'image_key_version', type: 'varchar', length: 10, nullable: true, select: false })
  imageKeyVersion: string | null;

  @Column({ name: 'image_mime_type', type: 'varchar', length: 127, nullable: true, select: false })
  imageMimeType: string | null;

  @Column({ name: 'image_size', type: 'integer', nullable: true, select: false })
  imageSize: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ name: 'leasing_monthly_fee', type: 'numeric', precision: 12, scale: 2, nullable: true })
  leasingMonthlyFee: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
