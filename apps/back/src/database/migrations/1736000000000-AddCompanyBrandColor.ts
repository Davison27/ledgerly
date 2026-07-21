import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyBrandColor1736000000000 implements MigrationInterface {
  name = 'AddCompanyBrandColor1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN "brand_color" varchar(7)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN "brand_color"
    `);
  }
}
