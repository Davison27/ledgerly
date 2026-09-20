import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('projects')
@Index('UQ_projects_code', ['code'], { unique: true })
@Check(
  'CHK_projects_image_envelope',
  '("image_ciphertext" IS NULL AND "image_nonce" IS NULL AND "image_tag" IS NULL AND "image_key_version" IS NULL AND "image_mime_type" IS NULL AND "image_size" IS NULL) OR ("image_ciphertext" IS NOT NULL AND "image_nonce" IS NOT NULL AND "image_tag" IS NOT NULL AND "image_key_version" IS NOT NULL AND "image_mime_type" IS NOT NULL AND "image_size" IS NOT NULL)',
)
@Check(
  'CHK_projects_image_bounds',
  '"image_ciphertext" IS NULL OR (octet_length("image_nonce") = 12 AND octet_length("image_tag") = 16 AND "image_key_version" ~ \'^v[1-9][0-9]{0,8}$\' AND "image_size" IS NOT NULL AND "image_size" >= 0 AND "image_size" <= 2097152 AND octet_length("image_ciphertext") = "image_size" AND "image_mime_type" IS NOT NULL AND octet_length("image_mime_type") <= 127 AND "image_mime_type" IN (\'image/png\', \'image/jpeg\', \'image/webp\'))',
)
export class ProjectOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 40 })
  code: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'client_company', type: 'varchar', length: 160, nullable: true })
  clientCompany: string | null;

  @Column({ name: 'client_tax_id', type: 'varchar', length: 40, nullable: true })
  clientTaxId: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 160, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 160, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 40, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  budget: string | null;

  @Column({ length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'fiscal_year', type: 'varchar', length: 10, nullable: true })
  fiscalYear: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  manager: string | null;

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

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;
}
