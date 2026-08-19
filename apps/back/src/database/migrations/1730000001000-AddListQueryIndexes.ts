import { MigrationInterface, QueryRunner } from 'typeorm';

type IndexDefinition = {
  name: string;
  sql: string;
  table: string;
};

function normalizeDefinition(definition: string): string {
  return definition
    .toLowerCase()
    .replaceAll('"', '')
    .replaceAll('public.', '')
    .replace(/\s+/g, ' ')
    .replace(/\(\(?([a-z_][a-z0-9_]*)\)?::text\)?/g, '$1')
    .trim();
}

function hasExpectedDefinition(definition: string, index: IndexDefinition): boolean {
  const normalized = normalizeDefinition(definition);
  const expected = normalizeDefinition(index.sql)
    .replace('create index concurrently ', 'create index ')
    .replace(`on ${index.table} (`, `on ${index.table} using btree (`);

  return normalized === expected;
}

export class AddListQueryIndexes1730000001000 implements MigrationInterface {
  name = 'AddListQueryIndexes1730000001000';
  transaction = false;

  private readonly indexes: IndexDefinition[] = [
    {
      name: 'IDX_documents_project_date_id',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_documents_project_date_id" ON "documents" ("project_id", "date" DESC, "id" DESC)',
      table: 'documents',
    },
    {
      name: 'IDX_documents_listing_date_id',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_documents_listing_date_id" ON "documents" ("date" DESC, "id" DESC)',
      table: 'documents',
    },
    {
      name: 'IDX_documents_invoice_amount',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_documents_invoice_amount" ON "documents" (LOWER(TRIM("invoice_number")), "amount", "date" DESC, "id" DESC)',
      table: 'documents',
    },
    {
      name: 'IDX_invoices_project_issue_id',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_invoices_project_issue_id" ON "invoices" ("project_id", "issue_date" DESC, "id" DESC)',
      table: 'invoices',
    },
    {
      name: 'IDX_invoice_lines_invoice_position',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_invoice_lines_invoice_position" ON "invoice_lines" ("invoice_id", "position", "id")',
      table: 'invoice_lines',
    },
    {
      name: 'IDX_staff_documents_member_issue_id',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_staff_documents_member_issue_id" ON "staff_documents" ("staff_member_id", "issue_date" DESC, "id" DESC)',
      table: 'staff_documents',
    },
    {
      name: 'IDX_schedule_event_days_date_event',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_schedule_event_days_date_event" ON "schedule_event_days" ("date", "event_id")',
      table: 'schedule_event_days',
    },
    {
      name: 'IDX_tax_deadline_due_project',
      sql: 'CREATE INDEX CONCURRENTLY "IDX_tax_deadline_due_project" ON "tax_deadline_occurrences" ("due_date", "project_id")',
      table: 'tax_deadline_occurrences',
    },
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const index of this.indexes) {
      const rows = (await queryRunner.query(
        `SELECT c.relname AS name, i.indisvalid AS valid, i.indisready AS ready,
                pg_get_indexdef(i.indexrelid) AS definition
         FROM pg_class c
         INNER JOIN pg_index i ON i.indexrelid = c.oid
         INNER JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relname = $1
           AND n.nspname = current_schema()`,
        [index.name],
      )) as unknown as Array<{ valid: boolean; ready: boolean; definition: string }>;
      if (rows.length === 0) {
        await queryRunner.query(index.sql);
        continue;
      }
      if (!rows[0].valid || !rows[0].ready) {
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`);
        await queryRunner.query(index.sql);
        continue;
      }
      if (!hasExpectedDefinition(String(rows[0].definition), index)) {
        throw new Error(`Index ${index.name} exists with an incompatible or invalid definition`);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [...this.indexes].reverse()) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`);
    }
  }
}
