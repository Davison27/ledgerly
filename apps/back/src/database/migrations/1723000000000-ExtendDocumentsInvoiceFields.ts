import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDocumentsInvoiceFields1723000000000 implements MigrationInterface {
  name = 'ExtendDocumentsInvoiceFields1723000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "issuer_name" varchar(200),
        ADD COLUMN "issuer_tax_id" varchar(40),
        ADD COLUMN "invoice_number" varchar(80),
        ADD COLUMN "due_date" date,
        ADD COLUMN "tax_base" numeric(12,2),
        ADD COLUMN "tax_rate" numeric(5,2),
        ADD COLUMN "tax_amount" numeric(12,2),
        ADD COLUMN "currency" varchar(3) NOT NULL DEFAULT 'EUR'
    `);

    await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "currency" DROP DEFAULT`);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "CHK_documents_tax_base" CHECK ("tax_base" IS NULL OR "tax_base" >= 0),
        ADD CONSTRAINT "CHK_documents_tax_rate" CHECK ("tax_rate" IS NULL OR "tax_rate" >= 0),
        ADD CONSTRAINT "CHK_documents_tax_amount" CHECK ("tax_amount" IS NULL OR "tax_amount" >= 0),
        ADD CONSTRAINT "CHK_documents_currency" CHECK ("currency" IN ('EUR', 'USD', 'GBP'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT "CHK_documents_currency",
        DROP CONSTRAINT "CHK_documents_tax_amount",
        DROP CONSTRAINT "CHK_documents_tax_rate",
        DROP CONSTRAINT "CHK_documents_tax_base"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN "currency",
        DROP COLUMN "tax_amount",
        DROP COLUMN "tax_rate",
        DROP COLUMN "tax_base",
        DROP COLUMN "due_date",
        DROP COLUMN "invoice_number",
        DROP COLUMN "issuer_tax_id",
        DROP COLUMN "issuer_name"
    `);
  }
}
