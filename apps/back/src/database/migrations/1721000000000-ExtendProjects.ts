import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendProjects1721000000000 implements MigrationInterface {
  name = 'ExtendProjects1721000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "type" varchar(20) NOT NULL DEFAULT 'other',
        ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN "description" text,
        ADD COLUMN "client_company" varchar(160),
        ADD COLUMN "client_tax_id" varchar(40),
        ADD COLUMN "contact_name" varchar(160),
        ADD COLUMN "contact_email" varchar(160),
        ADD COLUMN "contact_phone" varchar(40),
        ADD COLUMN "address" varchar(255),
        ADD COLUMN "start_date" date,
        ADD COLUMN "end_date" date,
        ADD COLUMN "budget" numeric(12,2),
        ADD COLUMN "currency" varchar(3) NOT NULL DEFAULT 'EUR',
        ADD COLUMN "fiscal_year" varchar(10),
        ADD COLUMN "manager" varchar(160)
    `);

    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "type" DROP DEFAULT`);

    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "CHK_projects_type" CHECK ("type" IN ('client', 'internal', 'audiovisual', 'construction', 'consulting', 'other')),
        ADD CONSTRAINT "CHK_projects_status" CHECK ("status" IN ('active', 'on_hold', 'completed', 'archived')),
        ADD CONSTRAINT "CHK_projects_currency" CHECK ("currency" IN ('EUR', 'USD', 'GBP')),
        ADD CONSTRAINT "CHK_projects_budget" CHECK ("budget" IS NULL OR "budget" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP CONSTRAINT "CHK_projects_budget",
        DROP CONSTRAINT "CHK_projects_currency",
        DROP CONSTRAINT "CHK_projects_status",
        DROP CONSTRAINT "CHK_projects_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN "manager",
        DROP COLUMN "fiscal_year",
        DROP COLUMN "currency",
        DROP COLUMN "budget",
        DROP COLUMN "end_date",
        DROP COLUMN "start_date",
        DROP COLUMN "address",
        DROP COLUMN "contact_phone",
        DROP COLUMN "contact_email",
        DROP COLUMN "contact_name",
        DROP COLUMN "client_tax_id",
        DROP COLUMN "client_company",
        DROP COLUMN "description",
        DROP COLUMN "status",
        DROP COLUMN "type"
    `);
  }
}
