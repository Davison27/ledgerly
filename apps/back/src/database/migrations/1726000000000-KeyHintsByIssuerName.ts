import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-keys `invoice_extraction_hints` by the issuer's printed name instead of
 * their tax id. The heuristic extraction routinely picks up the *client*'s
 * CIF/NIF (the ERP tenant, identical across every invoice) rather than the
 * supplier's, which collapsed every issuer's hints under a single key.
 * Existing rows were learned against that broken key and are discarded.
 */
export class KeyHintsByIssuerName1726000000000 implements MigrationInterface {
  name = 'KeyHintsByIssuerName1726000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "invoice_extraction_hints"`);

    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" DROP CONSTRAINT "UQ_invoice_extraction_hints_issuer_field"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_invoice_extraction_hints_issuer_tax_id"`);

    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" RENAME COLUMN "issuer_tax_id" TO "issuer_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" ALTER COLUMN "issuer_name" TYPE varchar(200)`,
    );

    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" ADD CONSTRAINT "UQ_invoice_extraction_hints_issuer_field" UNIQUE ("issuer_name", "field")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_extraction_hints_issuer_name" ON "invoice_extraction_hints" ("issuer_name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_invoice_extraction_hints_issuer_name"`);
    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" DROP CONSTRAINT "UQ_invoice_extraction_hints_issuer_field"`,
    );

    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" ALTER COLUMN "issuer_name" TYPE varchar(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" RENAME COLUMN "issuer_name" TO "issuer_tax_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "invoice_extraction_hints" ADD CONSTRAINT "UQ_invoice_extraction_hints_issuer_field" UNIQUE ("issuer_tax_id", "field")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_extraction_hints_issuer_tax_id" ON "invoice_extraction_hints" ("issuer_tax_id")`,
    );
  }
}
