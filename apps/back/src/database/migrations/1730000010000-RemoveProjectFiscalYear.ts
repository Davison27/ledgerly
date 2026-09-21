import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProjectFiscalYear1730000010000 implements MigrationInterface {
  name = 'RemoveProjectFiscalYear1730000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "fiscal_year"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "projects" ADD "fiscal_year" varchar(10)');
  }
}
