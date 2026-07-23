import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectColor1741000000000 implements MigrationInterface {
  name = 'AddProjectColor1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "color" varchar(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN "color"
    `);
  }
}
