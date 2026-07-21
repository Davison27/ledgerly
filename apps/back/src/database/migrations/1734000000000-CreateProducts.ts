import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1734000000000 implements MigrationInterface {
  name = 'CreateProducts1734000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "price" numeric(12,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_name" UNIQUE ("name"),
        CONSTRAINT "CHK_products_price" CHECK ("price" IS NULL OR "price" >= 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
