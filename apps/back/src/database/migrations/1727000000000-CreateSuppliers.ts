import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliers1727000000000 implements MigrationInterface {
  name = 'CreateSuppliers1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "tax_id" varchar(40),
        "email" varchar(160),
        "phone" varchar(40),
        "address" varchar(255),
        "iban" varchar(34),
        "notes" text,
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_suppliers_tax_id" ON "suppliers" ("tax_id") WHERE "tax_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
