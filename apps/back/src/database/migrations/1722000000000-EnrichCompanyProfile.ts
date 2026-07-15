import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrichCompanyProfile1722000000000 implements MigrationInterface {
  name = 'EnrichCompanyProfile1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "CHK_companies_color"`);

    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN "color",
        ALTER COLUMN "sector" DROP NOT NULL,
        ADD COLUMN "legal_name" varchar(160),
        ADD COLUMN "tax_id" varchar(40),
        ADD COLUMN "email" varchar(160),
        ADD COLUMN "phone" varchar(40),
        ADD COLUMN "website" varchar(255),
        ADD COLUMN "address" varchar(255),
        ADD COLUMN "city" varchar(120),
        ADD COLUMN "postal_code" varchar(20),
        ADD COLUMN "country" varchar(120),
        ADD COLUMN "logo" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN "logo",
        DROP COLUMN "country",
        DROP COLUMN "postal_code",
        DROP COLUMN "city",
        DROP COLUMN "address",
        DROP COLUMN "website",
        DROP COLUMN "phone",
        DROP COLUMN "email",
        DROP COLUMN "tax_id",
        DROP COLUMN "legal_name",
        ADD COLUMN "color" varchar(7)
    `);

    await queryRunner.query(`UPDATE "companies" SET "color" = '#1c5d97' WHERE "color" IS NULL`);
    await queryRunner.query(
      `UPDATE "companies" SET "sector" = 'Sin especificar' WHERE "sector" IS NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "companies"
        ALTER COLUMN "color" SET NOT NULL,
        ALTER COLUMN "sector" SET NOT NULL,
        ADD CONSTRAINT "CHK_companies_color" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$')
    `);
  }
}
