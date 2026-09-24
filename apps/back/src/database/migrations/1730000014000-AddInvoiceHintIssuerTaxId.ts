import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceHintIssuerTaxId1730000014000 implements MigrationInterface {
  name = 'AddInvoiceHintIssuerTaxId1730000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "invoice_extraction_hints" ADD "issuer_tax_id" varchar(40)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_invoice_extraction_hints_tax_id_field" ON "invoice_extraction_hints" ("issuer_tax_id", "field") WHERE "issuer_tax_id" IS NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_invoice_extraction_hints_tax_id_field"');
    await queryRunner.query('ALTER TABLE "invoice_extraction_hints" DROP COLUMN "issuer_tax_id"');
  }
}
