import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductStock1739000000000 implements MigrationInterface {
  name = 'AddProductStock1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "stock" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "CHK_products_stock" CHECK ("stock" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "CHK_products_stock"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "stock"`);
  }
}
