import { MigrationInterface, QueryRunner } from 'typeorm';

const documentMappings = [
  {
    column: 'type',
    constraint: 'CHK_documents_type',
    transitionConstraint: 'CHK_documents_type_u8_transition',
    legacyValues: ['factura', 'nomina', 'impuesto'],
    englishValues: ['invoice', 'payroll', 'tax'],
    cases: "CASE \"type\" WHEN 'factura' THEN 'invoice' WHEN 'nomina' THEN 'payroll' WHEN 'impuesto' THEN 'tax' ELSE \"type\" END",
  },
  {
    column: 'direction',
    constraint: 'CHK_documents_direction',
    transitionConstraint: 'CHK_documents_direction_u8_transition',
    legacyValues: ['ingreso', 'gasto'],
    englishValues: ['income', 'expense'],
    cases: "CASE \"direction\" WHEN 'ingreso' THEN 'income' WHEN 'gasto' THEN 'expense' ELSE \"direction\" END",
  },
  {
    column: 'status',
    constraint: 'CHK_documents_status',
    transitionConstraint: 'CHK_documents_status_u8_transition',
    legacyValues: ['pagado', 'pendiente', 'vencido'],
    englishValues: ['paid', 'pending', 'overdue'],
    cases: "CASE \"status\" WHEN 'pagado' THEN 'paid' WHEN 'pendiente' THEN 'pending' WHEN 'vencido' THEN 'overdue' ELSE \"status\" END",
  },
] as const;

const taxEntityMapping = {
  column: 'entity_type',
  constraint: 'CHK_tax_client_profiles_entity_type',
  transitionConstraint: 'CHK_tax_client_profiles_entity_type_u8_transition',
  legacyValues: ['autonomo', 'sociedad', 'particular'],
  englishValues: ['self_employed', 'company', 'individual'],
  cases: "CASE \"entity_type\" WHEN 'autonomo' THEN 'self_employed' WHEN 'sociedad' THEN 'company' WHEN 'particular' THEN 'individual' ELSE \"entity_type\" END",
} as const;

function valuesExpression(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

export class AdoptEnglishControlledValues1730000007000 implements MigrationInterface {
  name = 'AdoptEnglishControlledValues1730000007000';
  transaction = true;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const mapping of documentMappings) {
      await queryRunner.query(
        `ALTER TABLE "documents" ADD CONSTRAINT "${mapping.transitionConstraint}" CHECK ("${mapping.column}" IN (${valuesExpression([...mapping.legacyValues, ...mapping.englishValues])}))`,
      );
      await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "${mapping.constraint}"`);
      await queryRunner.query(
        `UPDATE "documents" SET "${mapping.column}" = ${mapping.cases} WHERE "${mapping.column}" IN (${valuesExpression(mapping.legacyValues)})`,
      );
      await queryRunner.query(
        `ALTER TABLE "documents" DROP CONSTRAINT "${mapping.transitionConstraint}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "documents" ADD CONSTRAINT "${mapping.constraint}" CHECK ("${mapping.column}" IN (${valuesExpression(mapping.englishValues)}))`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" ADD CONSTRAINT "${taxEntityMapping.transitionConstraint}" CHECK ("${taxEntityMapping.column}" IN (${valuesExpression([...taxEntityMapping.legacyValues, ...taxEntityMapping.englishValues])}))`,
    );
    await queryRunner.query(
      `UPDATE "tax_client_profiles" SET "${taxEntityMapping.column}" = ${taxEntityMapping.cases} WHERE "${taxEntityMapping.column}" IN (${valuesExpression(taxEntityMapping.legacyValues)})`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" DROP CONSTRAINT "${taxEntityMapping.transitionConstraint}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" ADD CONSTRAINT "${taxEntityMapping.constraint}" CHECK ("${taxEntityMapping.column}" IN (${valuesExpression(taxEntityMapping.englishValues)}))`,
    );

    await queryRunner.query('ALTER TABLE "tax_source_states" DROP COLUMN "label"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const mapping of documentMappings) {
      await queryRunner.query(
        `ALTER TABLE "documents" ADD CONSTRAINT "${mapping.transitionConstraint}" CHECK ("${mapping.column}" IN (${valuesExpression([...mapping.legacyValues, ...mapping.englishValues])}))`,
      );
      await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "${mapping.constraint}"`);
      await queryRunner.query(
        `UPDATE "documents" SET "${mapping.column}" = ${reverseCase(mapping)} WHERE "${mapping.column}" IN (${valuesExpression(mapping.englishValues)})`,
      );
      await queryRunner.query(
        `ALTER TABLE "documents" DROP CONSTRAINT "${mapping.transitionConstraint}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "documents" ADD CONSTRAINT "${mapping.constraint}" CHECK ("${mapping.column}" IN (${valuesExpression(mapping.legacyValues)}))`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" ADD CONSTRAINT "${taxEntityMapping.transitionConstraint}" CHECK ("${taxEntityMapping.column}" IN (${valuesExpression([...taxEntityMapping.legacyValues, ...taxEntityMapping.englishValues])}))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" DROP CONSTRAINT "${taxEntityMapping.constraint}"`,
    );
    await queryRunner.query(
      `UPDATE "tax_client_profiles" SET "${taxEntityMapping.column}" = ${reverseCase(taxEntityMapping)} WHERE "${taxEntityMapping.column}" IN (${valuesExpression(taxEntityMapping.englishValues)})`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_client_profiles" DROP CONSTRAINT "${taxEntityMapping.transitionConstraint}"`,
    );

    await queryRunner.query('ALTER TABLE "tax_source_states" ADD COLUMN "label" varchar(160)');
    await queryRunner.query(`
      UPDATE "tax_source_states"
      SET "label" = CASE "source_key"
        WHEN 'es-aeat-iva' THEN 'AEAT · IVA'
        WHEN 'es-aeat-renta' THEN 'AEAT · Renta'
        WHEN 'es-aeat-renta-sociedades' THEN 'AEAT · Renta y Sociedades'
        ELSE "source_key"
      END
    `);
    await queryRunner.query('ALTER TABLE "tax_source_states" ALTER COLUMN "label" SET NOT NULL');
  }
}

function reverseCase(mapping: {
  column: string;
  legacyValues: readonly string[];
  englishValues: readonly string[];
}): string {
  const clauses = mapping.englishValues
    .map((value, index) => `WHEN '${value}' THEN '${mapping.legacyValues[index]}'`)
    .join(' ');
  return `CASE "${mapping.column}" ${clauses} ELSE "${mapping.column}" END`;
}
