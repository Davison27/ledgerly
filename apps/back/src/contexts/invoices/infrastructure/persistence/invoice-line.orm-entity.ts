import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoice_lines')
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
}
