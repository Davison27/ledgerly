import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectImage1729000000000 implements MigrationInterface {
  name = 'AddProjectImage1729000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "image" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN "image"
    `);
  }
}
