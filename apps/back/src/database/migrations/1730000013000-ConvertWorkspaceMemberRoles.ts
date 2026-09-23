import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_PERMISSIONS = JSON.stringify({
  dashboard: 'view',
  projects: 'edit',
  calendar: 'edit',
  documents: 'edit',
  suppliers: 'edit',
  equipment: 'edit',
  staff: 'edit',
});

interface UnsafeRollbackRows {
  memberHasAdministratorPermissions: boolean;
  administratorHasNonAdministratorPermissions: boolean;
}

function isUnsafeRollbackRows(value: unknown): value is UnsafeRollbackRows {
  return (
    typeof value === 'object' &&
    value !== null &&
    'memberHasAdministratorPermissions' in value &&
    typeof value.memberHasAdministratorPermissions === 'boolean' &&
    'administratorHasNonAdministratorPermissions' in value &&
    typeof value.administratorHasNonAdministratorPermissions === 'boolean'
  );
}

export class ConvertWorkspaceMemberRoles1730000013000 implements MigrationInterface {
  name = 'ConvertWorkspaceMemberRoles1730000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "workspace_members" DROP CONSTRAINT "CHK_workspace_members_role"',
    );
    await queryRunner.query(`
      UPDATE "workspace_members"
      SET "role" = CASE WHEN "role" = 'admin' THEN 'admin' ELSE 'member' END
    `);
    await queryRunner.query(
      'ALTER TABLE "workspace_members" ADD CONSTRAINT "CHK_workspace_members_role" CHECK ("role" IN (\'admin\', \'member\'))',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const result: unknown = await queryRunner.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM "workspace_members"
           WHERE "role" = 'member' AND "permissions" = $1::jsonb
         ) AS "memberHasAdministratorPermissions",
         EXISTS (
           SELECT 1 FROM "workspace_members"
           WHERE "role" = 'admin' AND "permissions" IS DISTINCT FROM $1::jsonb
         ) AS "administratorHasNonAdministratorPermissions"`,
      [ADMIN_PERMISSIONS],
    );
    if (!Array.isArray(result) || !isUnsafeRollbackRows(result[0])) {
      throw new Error('Workspace role migration returned an invalid rollback-check result');
    }
    const unsafeRows = result[0];

    if (unsafeRows.memberHasAdministratorPermissions) {
      throw new Error(
        'Cannot roll back workspace roles while a member has the administrator permission matrix',
      );
    }

    if (unsafeRows.administratorHasNonAdministratorPermissions) {
      throw new Error(
        'Cannot roll back workspace roles while an administrator has a non-administrator permission matrix',
      );
    }

    await queryRunner.query(
      'ALTER TABLE "workspace_members" DROP CONSTRAINT "CHK_workspace_members_role"',
    );
    await queryRunner.query(
      `
      UPDATE "workspace_members"
      SET "role" = CASE
        WHEN "permissions" = $1::jsonb THEN 'admin'
        WHEN "permissions" = $2::jsonb THEN 'editor'
        WHEN "permissions" = $3::jsonb THEN 'viewer'
        ELSE 'custom'
      END
    `,
      [
        ADMIN_PERMISSIONS,
        JSON.stringify({
          dashboard: 'view',
          projects: 'edit',
          calendar: 'edit',
          documents: 'edit',
          suppliers: 'edit',
          equipment: 'edit',
          staff: 'view',
        }),
        JSON.stringify({
          dashboard: 'view',
          projects: 'view',
          calendar: 'view',
          documents: 'view',
          suppliers: 'view',
          equipment: 'view',
          staff: 'view',
        }),
      ],
    );
    await queryRunner.query(
      "ALTER TABLE \"workspace_members\" ADD CONSTRAINT \"CHK_workspace_members_role\" CHECK (\"role\" IN ('admin', 'editor', 'viewer', 'custom'))",
    );
  }
}
