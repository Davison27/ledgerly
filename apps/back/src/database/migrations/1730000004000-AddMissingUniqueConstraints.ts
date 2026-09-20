import { MigrationInterface, QueryRunner } from 'typeorm';

const indexes = [
  'UQ_notifications_dedupe_key_open',
  'UQ_workspace_members_founder',
  'UQ_workspace_members_email',
  'UQ_workspace_members_google_subject',
  'UQ_staff_document_types_code',
  'UQ_invoice_extraction_hints_issuer_field',
  'UQ_companies_singleton',
] as const;

export class AddMissingUniqueConstraints1730000004000 implements MigrationInterface {
  name = 'AddMissingUniqueConstraints1730000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_notifications_dedupe_key_open" ON "notifications" ("dedupe_key") WHERE "resolved_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_workspace_members_founder" ON "workspace_members" ("is_founder") WHERE "is_founder"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_workspace_members_email" ON "workspace_members" ("email")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_workspace_members_google_subject" ON "workspace_members" ("google_subject")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_staff_document_types_code" ON "staff_document_types" ("code")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_invoice_extraction_hints_issuer_field" ON "invoice_extraction_hints" ("issuer_name", "field")',
    );
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_companies_singleton" ON "companies" ((true))');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [...indexes].reverse()) {
      await queryRunner.query(`DROP INDEX "${index}"`);
    }
  }
}
