import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('invoice_lines')
@Index('IDX_invoice_lines_invoice_position', { synchronize: false })
export class InvoiceLineOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'smallint' })
  position: number;

  @Column({ length: 200 })
  description: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;
}
