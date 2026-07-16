import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceExtractionHints1725000000000 implements MigrationInterface {
  name = 'AddInvoiceExtractionHints1725000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "invoice_extraction_hints" (
        "id" uuid NOT NULL,
        "issuer_tax_id" varchar(40) NOT NULL,
        "field" varchar(32) NOT NULL,
        "anchor_kind" varchar(16) NOT NULL,
        "anchor_label" varchar(200) NOT NULL,
        "line_offset" integer NOT NULL DEFAULT 0,
        "sample_value" text NOT NULL,
        "occurrences" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoice_extraction_hints" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoice_extraction_hints_issuer_field" UNIQUE ("issuer_tax_id", "field"),
        CONSTRAINT "CHK_invoice_extraction_hints_anchor_kind" CHECK ("anchor_kind" IN ('inline', 'preceding-line')),
        CONSTRAINT "CHK_invoice_extraction_hints_occurrences" CHECK ("occurrences" >= 1)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_extraction_hints_issuer_tax_id" ON "invoice_extraction_hints" ("issuer_tax_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "invoice_extraction_hints"`);
  }
}
