import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoices1733000000000 implements MigrationInterface {
  name = 'CreateInvoices1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL,
        "series" varchar(10) NOT NULL,
        "year" integer NOT NULL,
        "number" integer NOT NULL,
        "issue_date" date NOT NULL,
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "customer_name" varchar(200) NOT NULL,
        "customer_tax_id" varchar(40),
        "customer_address" varchar(255),
        "tax_base" numeric(12,2) NOT NULL,
        "tax_rate" numeric(5,2) NOT NULL,
        "tax_amount" numeric(12,2) NOT NULL,
        "irpf_rate" numeric(5,2) NOT NULL,
        "irpf_amount" numeric(12,2) NOT NULL,
        "total" numeric(12,2) NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'EUR',
        "notes" text,
        "pdf" bytea,
        "pdf_size" integer,
        "document_id" uuid REFERENCES "documents"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoices_number" UNIQUE ("series", "year", "number"),
        CONSTRAINT "CHK_invoices_rates" CHECK ("tax_rate" >= 0 AND "irpf_rate" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invoice_lines" (
        "id" uuid NOT NULL,
        "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
        "position" smallint NOT NULL,
        "description" varchar(200) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_invoice_lines" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoice_lines_position" UNIQUE ("invoice_id", "position")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "invoice_lines"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
  }
}
