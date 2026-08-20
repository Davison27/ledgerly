import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('products')
export class ProductOrmEntity {
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
}
