import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('companies')
@Index('UQ_companies_singleton', { synchronize: false })
@Check(
  'CHK_companies_logo_envelope',
  '("logo_ciphertext" IS NULL AND "logo_nonce" IS NULL AND "logo_tag" IS NULL AND "logo_key_version" IS NULL AND "logo_mime_type" IS NULL AND "logo_size" IS NULL) OR ("logo_ciphertext" IS NOT NULL AND "logo_nonce" IS NOT NULL AND "logo_tag" IS NOT NULL AND "logo_key_version" IS NOT NULL AND "logo_mime_type" IS NOT NULL AND "logo_size" IS NOT NULL)',
)
@Check(
  'CHK_companies_logo_bounds',
  '"logo_ciphertext" IS NULL OR (octet_length("logo_nonce") = 12 AND octet_length("logo_tag") = 16 AND "logo_key_version" ~ \'^v[1-9][0-9]{0,8}$\' AND "logo_size" IS NOT NULL AND "logo_size" >= 0 AND "logo_size" <= 2097152 AND octet_length("logo_ciphertext") = "logo_size" AND "logo_mime_type" IS NOT NULL AND octet_length("logo_mime_type") <= 127 AND "logo_mime_type" IN (\'image/png\', \'image/jpeg\', \'image/webp\'))',
)
export class CompanyOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 160, nullable: true })
  legalName: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 40, nullable: true })
  taxId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sector: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string | null;

  @Column({ name: 'logo_ciphertext', type: 'bytea', nullable: true, select: false })
  logoCiphertext: Buffer | null;

  @Column({ name: 'logo_nonce', type: 'bytea', nullable: true, select: false })
  logoNonce: Buffer | null;

  @Column({ name: 'logo_tag', type: 'bytea', nullable: true, select: false })
  logoTag: Buffer | null;

  @Column({ name: 'logo_key_version', type: 'varchar', length: 10, nullable: true, select: false })
  logoKeyVersion: string | null;

  @Column({ name: 'logo_mime_type', type: 'varchar', length: 127, nullable: true, select: false })
  logoMimeType: string | null;

  @Column({ name: 'logo_size', type: 'integer', nullable: true, select: false })
  logoSize: number | null;

  @Column({ name: 'brand_color', type: 'varchar', length: 7, nullable: true })
  brandColor: string | null;
}
