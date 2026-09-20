import { MigrationInterface, QueryRunner } from 'typeorm';

const PROJECTS_CODE_INDEX_ORIGINAL_NAME = 'IDX_d95a87318392465ab663a32cc4';
const PROJECTS_CODE_INDEX_RENAMED_NAME = 'UQ_projects_code';

const timestampColumnsWithNormalizedDefault: ReadonlyArray<{ column: string; table: string }> = [
  { table: 'security_audit_logs', column: 'created_at' },
  { table: 'company_documents', column: 'created_at' },
  { table: 'extraction_outcomes', column: 'created_at' },
  { table: 'invoice_extraction_hints', column: 'created_at' },
  { table: 'invoice_extraction_hints', column: 'updated_at' },
  { table: 'equipment_documents', column: 'created_at' },
  { table: 'equipment', column: 'created_at' },
  { table: 'notifications', column: 'created_at' },
  { table: 'schedule_events', column: 'created_at' },
  { table: 'staff_members', column: 'created_at' },
  { table: 'staff_documents', column: 'created_at' },
  { table: 'tax_compliance_settings', column: 'updated_at' },
  { table: 'tax_source_states', column: 'updated_at' },
];

export class ReconcileEntitySchemaDrift1730000003000 implements MigrationInterface {
  name = 'ReconcileEntitySchemaDrift1730000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of timestampColumnsWithNormalizedDefault) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT now()`);
    }
    await queryRunner.query(
      `ALTER INDEX "${PROJECTS_CODE_INDEX_ORIGINAL_NAME}" RENAME TO "${PROJECTS_CODE_INDEX_RENAMED_NAME}"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "${PROJECTS_CODE_INDEX_RENAMED_NAME}" RENAME TO "${PROJECTS_CODE_INDEX_ORIGINAL_NAME}"`,
    );
    for (const { table, column } of [...timestampColumnsWithNormalizedDefault].reverse()) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT CURRENT_TIMESTAMP`);
    }
  }
}
