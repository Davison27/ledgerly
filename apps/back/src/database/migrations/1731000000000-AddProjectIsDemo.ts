import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIsDemo1731000000000 implements MigrationInterface {
  name = 'AddProjectIsDemo1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "is_demo" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN "is_demo"
    `);
  }
}
