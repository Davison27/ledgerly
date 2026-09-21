import { MigrationInterface, QueryRunner } from 'typeorm';

const checks = [
  { name: 'CHK_documents_type', table: 'documents', expression: `"type" IN ('factura', 'nomina', 'impuesto')` },
  { name: 'CHK_documents_direction', table: 'documents', expression: `"direction" IN ('ingreso', 'gasto')` },
  { name: 'CHK_documents_status', table: 'documents', expression: `"status" IN ('pagado', 'pendiente', 'vencido')` },
  { name: 'CHK_documents_currency', table: 'documents', expression: `"currency" IN ('EUR', 'USD', 'GBP')` },
  { name: 'CHK_projects_status', table: 'projects', expression: `"status" IN ('active', 'on_hold', 'completed', 'archived')` },
  { name: 'CHK_projects_type', table: 'projects', expression: `"type" IN ('client', 'internal', 'audiovisual', 'construction', 'consulting', 'other')` },
  { name: 'CHK_projects_currency', table: 'projects', expression: `"currency" IN ('EUR', 'USD', 'GBP')` },
  { name: 'CHK_notifications_severity', table: 'notifications', expression: `"severity" IN ('error', 'warning', 'info')` },
  { name: 'CHK_notifications_resource_kind', table: 'notifications', expression: `"resource_kind" IN ('document', 'staff_member', 'schedule_event', 'none')` },
  {
    name: 'CHK_tax_deadline_occurrences_status',
    table: 'tax_deadline_occurrences',
    expression: `"status" IN ('pending', 'in_progress', 'submitted', 'paid', 'dismissed')`,
  },
  { name: 'CHK_workspace_members_role', table: 'workspace_members', expression: `"role" IN ('admin', 'editor', 'viewer', 'custom')` },
  { name: 'CHK_workspace_members_status', table: 'workspace_members', expression: `"status" IN ('invited', 'active', 'disabled')` },
] as const;

export class NormalizeDerivedColumns1730000006000 implements MigrationInterface {
  name = 'NormalizeDerivedColumns1730000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "tax_id" varchar(40),
        "contact_name" varchar(160),
        "contact_email" varchar(160),
        "contact_phone" varchar(40),
        "archived_at" timestamptz,
        CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('ALTER TABLE "projects" ADD "client_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT',
    );
    await queryRunner.query('CREATE INDEX "IDX_projects_client_id" ON "projects" ("client_id")');

    await queryRunner.query(`
      CREATE TABLE "project_equipment_lease_expenses" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "equipment_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "expense_date" date NOT NULL,
        CONSTRAINT "PK_6c9f31f3bb3154aba5e5652de17" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_equipment_lease_expenses_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_project_equipment_lease_expenses_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_project_equipment_lease_expenses_project" ON "project_equipment_lease_expenses" ("project_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_project_equipment_lease_expenses_equipment" ON "project_equipment_lease_expenses" ("equipment_id")',
    );

    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "contact_phone"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "contact_email"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "contact_name"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "client_tax_id"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "client_company"');
    await queryRunner.query('ALTER TABLE "project_equipment" DROP COLUMN "lease_expense_date"');
    await queryRunner.query('ALTER TABLE "project_equipment" DROP COLUMN "lease_expense"');

    await queryRunner.query('DROP INDEX "IDX_2316d4640156bba9d2a2986313"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "occurrence_key"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "source_version"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "source_url"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "code"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "category"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "description"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" DROP COLUMN "title"');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_tax_deadline_occurrences_natural" ON "tax_deadline_occurrences" ("project_id", "obligation_key", "period_start", "period_end")',
    );
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "month"');

    for (const check of checks) {
      await queryRunner.query(
        `ALTER TABLE "${check.table}" ADD CONSTRAINT "${check.name}" CHECK (${check.expression})`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const check of [...checks].reverse()) {
      await queryRunner.query(`ALTER TABLE "${check.table}" DROP CONSTRAINT "${check.name}"`);
    }

    await queryRunner.query('ALTER TABLE "documents" ADD "month" smallint');
    await queryRunner.query('DROP INDEX "UQ_tax_deadline_occurrences_natural"');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "occurrence_key" varchar(240)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_2316d4640156bba9d2a2986313" ON "tax_deadline_occurrences" ("occurrence_key")',
    );
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "title" varchar(180)');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "description" text');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "category" varchar(30)');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "code" varchar(20)');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "source_url" varchar(500)');
    await queryRunner.query('ALTER TABLE "tax_deadline_occurrences" ADD "source_version" varchar(40)');

    await queryRunner.query('ALTER TABLE "project_equipment" ADD "lease_expense" numeric(12,2)');
    await queryRunner.query('ALTER TABLE "project_equipment" ADD "lease_expense_date" date');

    await queryRunner.query('DROP INDEX "IDX_projects_client_id"');
    await queryRunner.query('ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_client"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "client_id"');
    await queryRunner.query('ALTER TABLE "projects" ADD "client_company" varchar(160)');
    await queryRunner.query('ALTER TABLE "projects" ADD "client_tax_id" varchar(40)');
    await queryRunner.query('ALTER TABLE "projects" ADD "contact_name" varchar(160)');
    await queryRunner.query('ALTER TABLE "projects" ADD "contact_email" varchar(160)');
    await queryRunner.query('ALTER TABLE "projects" ADD "contact_phone" varchar(40)');

    await queryRunner.query('DROP TABLE "project_equipment_lease_expenses"');
    await queryRunner.query('DROP TABLE "clients"');
  }
}
