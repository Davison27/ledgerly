import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, MigrationInterface } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from './1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from './1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from './1730000002000-AddEncryptedStoredFileEnvelopes';
import { ReconcileEntitySchemaDrift1730000003000 } from './1730000003000-ReconcileEntitySchemaDrift';
import { AddMissingUniqueConstraints1730000004000 } from './1730000004000-AddMissingUniqueConstraints';
import { AddReferentialIntegrity1730000005000 } from './1730000005000-AddReferentialIntegrity';
import { NormalizeDerivedColumns1730000006000 } from './1730000006000-NormalizeDerivedColumns';
import { AdoptEnglishControlledValues1730000007000 } from './1730000007000-AdoptEnglishControlledValues';

const migrations: Array<new () => MigrationInterface> = [
  InitialLedgerlySchema1730000000000,
  AddListQueryIndexes1730000001000,
  AddEncryptedStoredFileEnvelopes1730000002000,
  ReconcileEntitySchemaDrift1730000003000,
  AddMissingUniqueConstraints1730000004000,
  AddReferentialIntegrity1730000005000,
  NormalizeDerivedColumns1730000006000,
  AdoptEnglishControlledValues1730000007000,
];

const encryptedChecks = [
  'CHK_companies_logo_envelope',
  'CHK_companies_logo_bounds',
  'CHK_documents_content_envelope',
  'CHK_documents_content_bounds',
  'CHK_documents_content_metadata_size',
  'CHK_equipment_image_envelope',
  'CHK_equipment_image_bounds',
  'CHK_equipment_documents_content_envelope',
  'CHK_equipment_documents_content_bounds',
  'CHK_equipment_documents_content_metadata_size',
  'CHK_projects_image_envelope',
  'CHK_projects_image_bounds',
  'CHK_staff_documents_content_envelope',
  'CHK_staff_documents_content_bounds',
  'CHK_staff_documents_content_metadata_size',
  'CHK_company_documents_content_envelope',
  'CHK_company_documents_content_bounds',
  'CHK_company_documents_content_metadata_size',
] as const;

const domainChecks = [
  'CHK_documents_type',
  'CHK_documents_direction',
  'CHK_documents_status',
  'CHK_documents_currency',
  'CHK_projects_status',
  'CHK_projects_type',
  'CHK_projects_currency',
  'CHK_notifications_severity',
  'CHK_notifications_resource_kind',
  'CHK_tax_deadline_occurrences_status',
  'CHK_workspace_members_role',
  'CHK_workspace_members_status',
  'CHK_tax_client_profiles_entity_type',
] as const;

const projectId = '00000000-0000-0000-0000-000000000701';
const profileId = '00000000-0000-0000-0000-000000000702';
const profileIds = [
  profileId,
  '00000000-0000-0000-0000-000000000707',
  '00000000-0000-0000-0000-000000000710',
] as const;
const profileProjectIds = [
  projectId,
  '00000000-0000-0000-0000-000000000706',
  '00000000-0000-0000-0000-000000000709',
] as const;
const documentIds = [
  '00000000-0000-0000-0000-000000000703',
  '00000000-0000-0000-0000-000000000704',
  '00000000-0000-0000-0000-000000000705',
] as const;

describe('AdoptEnglishControlledValues1730000007000', () => {
  let dataSource: DataSource;
  let schema: string;
  let testDatabaseUrl: string;

  beforeEach(async () => {
    testDatabaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;

    const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = createDataSource(testDatabaseUrl, schema, migrations.slice(0, -1));
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
    await insertLegacyRows(dataSource);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();

    if (schema && testDatabaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: testDatabaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('converts every controlled value, removes source labels, and round-trips through down and up', async () => {
    await runU8('up');

    const migratedDocuments: Array<{ type: string; direction: string; status: string }> =
      await dataSource.query(
        `SELECT type, direction, status FROM documents WHERE id = ANY($1) ORDER BY id`,
        [documentIds],
      );
    expect(migratedDocuments).toEqual([
      { type: 'invoice', direction: 'income', status: 'paid' },
      { type: 'payroll', direction: 'expense', status: 'pending' },
      { type: 'tax', direction: 'income', status: 'overdue' },
    ]);

    const profileRows: Array<{ entityType: string }> = await dataSource.query(
      `SELECT entity_type AS "entityType" FROM tax_client_profiles WHERE id = ANY($1) ORDER BY id`,
      [profileIds],
    );
    expect(profileRows).toEqual([
      { entityType: 'self_employed' },
      { entityType: 'company' },
      { entityType: 'individual' },
    ]);

    const labelColumns: Array<{ columnName: string }> = await dataSource.query(
      `SELECT column_name AS "columnName"
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'tax_source_states' AND column_name = 'label'`,
    );
    expect(labelColumns).toHaveLength(0);

    const presentChecks: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = ANY($1)
       ORDER BY conname`,
      [[...encryptedChecks, ...domainChecks]],
    );
    expect(presentChecks.map((row) => row.name)).toEqual(
      [...encryptedChecks, ...domainChecks].sort(),
    );

    for (const value of ['factura', 'nomina', 'impuesto']) {
      await expect(dataSource.query(`UPDATE documents SET type = $1 WHERE id = $2`, [value, documentIds[0]])).rejects.toThrow();
    }
    for (const value of ['ingreso', 'gasto']) {
      await expect(dataSource.query(`UPDATE documents SET direction = $1 WHERE id = $2`, [value, documentIds[1]])).rejects.toThrow();
    }
    for (const value of ['pagado', 'pendiente', 'vencido']) {
      await expect(dataSource.query(`UPDATE documents SET status = $1 WHERE id = $2`, [value, documentIds[2]])).rejects.toThrow();
    }
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'autonomo' WHERE id = $1`, [profileId])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'sociedad' WHERE id = $1`, [profileIds[1]])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'particular' WHERE id = $1`, [profileIds[2]])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE documents SET type = 'invoice' WHERE id = $1`, [documentIds[0]])).resolves.toBeDefined();
    await expect(dataSource.query(`UPDATE documents SET direction = 'expense' WHERE id = $1`, [documentIds[1]])).resolves.toBeDefined();
    await expect(dataSource.query(`UPDATE documents SET status = 'overdue' WHERE id = $1`, [documentIds[2]])).resolves.toBeDefined();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'self_employed' WHERE id = $1`, [profileIds[0]])).resolves.toBeDefined();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'company' WHERE id = $1`, [profileIds[1]])).resolves.toBeDefined();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'individual' WHERE id = $1`, [profileIds[2]])).resolves.toBeDefined();
    for (const value of ['invoice', 'payroll', 'tax']) {
      await expect(dataSource.query(`UPDATE documents SET type = $1 WHERE id = $2`, [value, documentIds[0]])).resolves.toBeDefined();
    }
    await dataSource.query(`UPDATE documents SET type = 'invoice' WHERE id = $1`, [documentIds[0]]);
    for (const value of ['income', 'expense']) {
      await expect(dataSource.query(`UPDATE documents SET direction = $1 WHERE id = $2`, [value, documentIds[1]])).resolves.toBeDefined();
    }
    await dataSource.query(`UPDATE documents SET direction = 'expense' WHERE id = $1`, [documentIds[1]]);
    for (const value of ['paid', 'pending', 'overdue']) {
      await expect(dataSource.query(`UPDATE documents SET status = $1 WHERE id = $2`, [value, documentIds[2]])).resolves.toBeDefined();
    }
    await dataSource.query(`UPDATE documents SET status = 'overdue' WHERE id = $1`, [documentIds[2]]);

    await runU8('down');

    const restoredDocuments: Array<{ type: string; direction: string; status: string }> =
      await dataSource.query(
        `SELECT type, direction, status FROM documents WHERE id = ANY($1) ORDER BY id`,
        [documentIds],
      );
    expect(restoredDocuments).toEqual([
      { type: 'factura', direction: 'ingreso', status: 'pagado' },
      { type: 'nomina', direction: 'gasto', status: 'pendiente' },
      { type: 'impuesto', direction: 'ingreso', status: 'vencido' },
    ]);

    const restoredProfileRows: Array<{ entityType: string }> = await dataSource.query(
      `SELECT entity_type AS "entityType" FROM tax_client_profiles WHERE id = ANY($1) ORDER BY id`,
      [profileIds],
    );
    expect(restoredProfileRows).toEqual([
      { entityType: 'autonomo' },
      { entityType: 'sociedad' },
      { entityType: 'particular' },
    ]);

    const restoredSources: Array<{ sourceKey: string; label: string }> = await dataSource.query(
      `SELECT source_key AS "sourceKey", label
       FROM tax_source_states
       ORDER BY source_key`,
    );
    expect(restoredSources).toEqual([
      { sourceKey: 'es-aeat-iva', label: 'AEAT · IVA' },
      { sourceKey: 'es-aeat-renta', label: 'AEAT · Renta' },
      { sourceKey: 'es-aeat-renta-sociedades', label: 'AEAT · Renta y Sociedades' },
    ]);

    await expect(dataSource.query(`UPDATE documents SET type = 'invoice' WHERE id = $1`, [documentIds[0]])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE documents SET direction = 'income' WHERE id = $1`, [documentIds[1]])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE documents SET status = 'pending' WHERE id = $1`, [documentIds[2]])).rejects.toThrow();
    await expect(dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'self_employed' WHERE id = $1`, [profileId])).resolves.toBeDefined();
    await dataSource.query(`UPDATE tax_client_profiles SET entity_type = 'autonomo' WHERE id = $1`, [profileId]);

    const restoredProfileChecks: Array<{ name: string }> = await dataSource.query(
      `SELECT conname AS name
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace AND conname = 'CHK_tax_client_profiles_entity_type'`,
    );
    expect(restoredProfileChecks).toHaveLength(0);

    await runU8('up');

    const reappliedProfileRows: Array<{ entityType: string }> = await dataSource.query(
      `SELECT entity_type AS "entityType" FROM tax_client_profiles WHERE id = ANY($1) ORDER BY id`,
      [profileIds],
    );
    expect(reappliedProfileRows).toEqual([
      { entityType: 'self_employed' },
      { entityType: 'company' },
      { entityType: 'individual' },
    ]);
  });

  async function runU8(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new AdoptEnglishControlledValues1730000007000();
      if (direction === 'up') await migration.up(queryRunner);
      else await migration.down(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
});

async function insertLegacyRows(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO projects (id, name, code, type) VALUES ($1, 'Migration Project', 'U8-PROJECT', 'client')`,
    [projectId],
  );
  await dataSource.query(
    `INSERT INTO projects (id, name, code, type) VALUES ($1, 'Migration Project Two', 'U8-PROJECT-2', 'client')`,
    [profileProjectIds[1]],
  );
  await dataSource.query(
    `INSERT INTO projects (id, name, code, type) VALUES ($1, 'Migration Project Three', 'U8-PROJECT-3', 'client')`,
    [profileProjectIds[2]],
  );
  await dataSource.query(
    `INSERT INTO documents (id, project_id, name, type, date, amount, status, currency, direction)
     VALUES
       ($1, $4, 'Legacy Invoice', 'factura', '2026-01-01', 100, 'pagado', 'EUR', 'ingreso'),
       ($2, $4, 'Legacy Payroll', 'nomina', '2026-02-01', 200, 'pendiente', 'EUR', 'gasto'),
       ($3, $4, 'Legacy Tax', 'impuesto', '2026-03-01', 300, 'vencido', 'EUR', 'ingreso')`,
    [...documentIds, projectId],
  );
  await dataSource.query(
    `INSERT INTO tax_client_profiles (id, project_id, country_code, entity_type, obligation_keys)
     VALUES
       ($1, $4, 'ES', 'autonomo', '[]'::jsonb),
       ($2, $5, 'ES', 'sociedad', '[]'::jsonb),
       ($3, $6, 'ES', 'particular', '[]'::jsonb)`,
    [...profileIds, ...profileProjectIds],
  );
  await dataSource.query(
    `INSERT INTO tax_source_states (source_key, country_code, label, format, source_url, feed_url)
     VALUES
       ('es-aeat-iva', 'ES', 'AEAT · IVA', 'ical', 'https://example.test/iva', 'https://example.test/iva.ics'),
       ('es-aeat-renta', 'ES', 'AEAT · Renta', 'ical', 'https://example.test/renta', 'https://example.test/renta.ics'),
       ('es-aeat-renta-sociedades', 'ES', 'AEAT · Renta y Sociedades', 'ical', 'https://example.test/sociedades', 'https://example.test/sociedades.ics')`,
  );
}

function createDataSource(
  testDatabaseUrl: string,
  schema: string,
  migrationList: Array<new () => MigrationInterface>,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    logging: false,
    entities: [join(__dirname, '..', '..', 'contexts', '**', '*.orm-entity.{ts,js}')],
    migrations: migrationList,
    migrationsTransactionMode: 'each',
    extra: { max: 1, options: `-c search_path=${schema},public` },
  });
}

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid migration test database URL');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid migration test database URL');
  }

  if (
    (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') ||
    (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') ||
    url.port.length === 0 ||
    url.pathname !== '/ledgerly_migration_test' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error('Invalid migration test database URL');
  }

  return value;
}
