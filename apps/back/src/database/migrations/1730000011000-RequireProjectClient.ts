import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireProjectClient1730000011000 implements MigrationInterface {
  name = 'RequireProjectClient1730000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      'SELECT 1 FROM "projects" WHERE "client_id" IS NULL LIMIT 1',
    )) as unknown[];
    if (rows.length > 0) {
      throw new Error(
        'Cannot enforce mandatory project client ownership: projects.client_id contains NULL values; assign every project an active client or reset and reseed the local database before retrying',
      );
    }

    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "client_id" SET NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "client_id" DROP NOT NULL');
  }
}
