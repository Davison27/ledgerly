import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentSupplier1728000000000 implements MigrationInterface {
  name = 'AddDocumentSupplier1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "supplier_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "FK_documents_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_documents_supplier_id" ON "documents" ("supplier_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_documents_supplier_id"`);

    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT "FK_documents_supplier"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN "supplier_id"
    `);
  }
}
