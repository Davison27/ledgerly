import { MigrationInterface, QueryRunner } from 'typeorm';

const CANONICAL_TAX_ID_EXPRESSION = `NULLIF(regexp_replace(upper(btrim("tax_id")), '[[:space:].-]', '', 'g'), '')`;

export class NormalizeTaxIdsAndEnforceUniqueness1730000008000 implements MigrationInterface {
  name = 'NormalizeTaxIdsAndEnforceUniqueness1730000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const clientDuplicates = await this.findDuplicates(queryRunner, 'clients');
    const supplierDuplicates = await this.findDuplicates(queryRunner, 'suppliers');

    const conflicts = [
      ...this.formatConflicts('clients', clientDuplicates),
      ...this.formatConflicts('suppliers', supplierDuplicates),
    ];
    if (conflicts.length > 0) {
      throw new Error(`Cannot normalize tax IDs; conflicting canonical values: ${conflicts.join('; ')}`);
    }

    await queryRunner.query(
      `UPDATE "clients" SET "tax_id" = ${CANONICAL_TAX_ID_EXPRESSION} WHERE "tax_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "suppliers" SET "tax_id" = ${CANONICAL_TAX_ID_EXPRESSION} WHERE "tax_id" IS NOT NULL`,
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_clients_tax_id" ON "clients" ("tax_id") WHERE "tax_id" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_suppliers_tax_id" ON "suppliers" ("tax_id") WHERE "tax_id" IS NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_suppliers_tax_id"');
    await queryRunner.query('DROP INDEX "UQ_clients_tax_id"');
  }

  private async findDuplicates(queryRunner: QueryRunner, table: 'clients' | 'suppliers'): Promise<Array<{ taxId: string; count: number }>> {
    const rawRows: unknown = await queryRunner.query(
      `SELECT ${CANONICAL_TAX_ID_EXPRESSION} AS "taxId", count(*)::int AS count
       FROM "${table}"
       WHERE "tax_id" IS NOT NULL AND ${CANONICAL_TAX_ID_EXPRESSION} IS NOT NULL
       GROUP BY ${CANONICAL_TAX_ID_EXPRESSION}
       HAVING count(*) > 1
       ORDER BY ${CANONICAL_TAX_ID_EXPRESSION}`,
    );

    if (!Array.isArray(rawRows)) return [];

    return (rawRows as unknown[])
      .filter(isDuplicateRow)
      .map((row) => ({ taxId: row.taxId, count: Number(row.count) }));
  }

  private formatConflicts(table: string, duplicates: Array<{ taxId: string; count: number }>): string[] {
    return duplicates.map((duplicate) => `${table}.${duplicate.taxId} (${duplicate.count} rows)`);
  }
}

function isDuplicateRow(value: unknown): value is { taxId: string; count: number | string } {
  if (typeof value !== 'object' || value === null) return false;

  const row = value as { taxId?: unknown; count?: unknown };
  return (
    typeof row.taxId === 'string' &&
    (typeof row.count === 'number' || typeof row.count === 'string')
  );
}
