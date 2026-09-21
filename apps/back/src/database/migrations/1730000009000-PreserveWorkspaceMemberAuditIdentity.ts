import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveWorkspaceMemberAuditIdentity1730000009000 implements MigrationInterface {
  name = 'PreserveWorkspaceMemberAuditIdentity1730000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "documents" SET "created_by" = NULL
       WHERE "created_by" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "workspace_members" WHERE "workspace_members"."id" = "documents"."created_by")`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "deleted_by" = NULL
       WHERE "deleted_by" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "workspace_members" WHERE "workspace_members"."id" = "documents"."deleted_by")`,
    );
    await queryRunner.query(
      'ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_created_by_workspace_member" FOREIGN KEY ("created_by") REFERENCES "workspace_members"("id") ON DELETE RESTRICT',
    );
    await queryRunner.query(
      'ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_deleted_by_workspace_member" FOREIGN KEY ("deleted_by") REFERENCES "workspace_members"("id") ON DELETE RESTRICT',
    );
    await queryRunner.query('CREATE INDEX "IDX_documents_created_by" ON "documents" ("created_by")');
    await queryRunner.query('CREATE INDEX "IDX_documents_deleted_by" ON "documents" ("deleted_by")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_documents_deleted_by"');
    await queryRunner.query('DROP INDEX "IDX_documents_created_by"');
    await queryRunner.query('ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_deleted_by_workspace_member"');
    await queryRunner.query('ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_created_by_workspace_member"');
  }
}
