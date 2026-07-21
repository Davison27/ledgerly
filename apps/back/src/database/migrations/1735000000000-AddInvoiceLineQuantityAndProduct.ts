import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceLineQuantityAndProduct1735000000000 implements MigrationInterface {
  name = 'AddInvoiceLineQuantityAndProduct1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_lines" ADD COLUMN "quantity" numeric(12,3) NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_lines" ADD COLUMN "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_lines" ADD CONSTRAINT "CHK_invoice_lines_quantity" CHECK ("quantity" > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoice_lines" DROP CONSTRAINT "CHK_invoice_lines_quantity"`);
    await queryRunner.query(`ALTER TABLE "invoice_lines" DROP COLUMN "product_id"`);
    await queryRunner.query(`ALTER TABLE "invoice_lines" DROP COLUMN "quantity"`);
  }
}
