import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('companies')
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
