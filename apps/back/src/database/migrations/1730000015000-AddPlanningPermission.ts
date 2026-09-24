import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanningPermission1730000015000 implements MigrationInterface {
  name = 'AddPlanningPermission1730000015000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "workspace_members"
      SET "permissions" = COALESCE("permissions", '{}'::jsonb) || '{"planning":"none"}'::jsonb
      WHERE NOT (COALESCE("permissions", '{}'::jsonb) ? 'planning')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "workspace_members"
      SET "permissions" = "permissions" - 'planning'
      WHERE "permissions" ? 'planning'
    `);
  }
}
