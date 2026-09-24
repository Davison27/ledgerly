import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AddProjectChecklists1730000016000 } from './1730000016000-AddProjectChecklists';

describe('AddProjectChecklists1730000016000', () => {
  let dataSource: DataSource;
  let databaseUrl: string;
  let schema: string;

  beforeEach(async () => {
    databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_migration_${randomUUID().replaceAll('-', '')}`;

    const administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);
    await administrator.destroy();

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      logging: false,
      extra: { max: 1, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.query('CREATE TABLE projects (id uuid PRIMARY KEY)');
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();

    if (schema && databaseUrl) {
      const administrator = new DataSource({ type: 'postgres', url: databaseUrl });
      await administrator.initialize();
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('defaults planning off, isolates snapshots, and rolls the schema back', async () => {
    await invokeMigration('up');

    const projectId = randomUUID();
    const templateId = randomUUID();
    const templateItemId = randomUUID();
    const checklistItemId = randomUUID();
    await dataSource.query('INSERT INTO projects (id) VALUES ($1)', [projectId]);
    const projects: Array<{ planningEnabled: boolean }> = await dataSource.query(
      'SELECT planning_enabled AS "planningEnabled" FROM projects WHERE id = $1',
      [projectId],
    );
    expect(projects).toEqual([{ planningEnabled: false }]);

    await dataSource.query('INSERT INTO project_checklist_templates (id, name) VALUES ($1, $2)', [templateId, 'Template']);
    await dataSource.query(
      'INSERT INTO project_checklist_template_items (id, template_id, text, position) VALUES ($1, $2, $3, 0)',
      [templateItemId, templateId, 'Template item'],
    );
    await dataSource.query(
      'INSERT INTO project_checklists (project_id, source_template_id, name) VALUES ($1, $2, $3)',
      [projectId, templateId, 'Project snapshot'],
    );
    await dataSource.query(
      'INSERT INTO project_checklist_items (id, project_id, text, position) VALUES ($1, $2, $3, 0)',
      [checklistItemId, projectId, 'Copied item'],
    );

    await dataSource.query('DELETE FROM project_checklist_templates WHERE id = $1', [templateId]);
    const snapshots: Array<{ sourceTemplateId: string | null; text: string }> = await dataSource.query(
      `SELECT c.source_template_id AS "sourceTemplateId", i.text
       FROM project_checklists c
       JOIN project_checklist_items i ON i.project_id = c.project_id
       WHERE c.project_id = $1`,
      [projectId],
    );
    expect(snapshots).toEqual([{ sourceTemplateId: null, text: 'Copied item' }]);

    await dataSource.query('DELETE FROM projects WHERE id = $1', [projectId]);
    const remainingItems: Array<{ count: number | string }> = await dataSource.query(
      'SELECT count(*)::int AS count FROM project_checklist_items',
    );
    expect(Number(remainingItems[0]?.count ?? 0)).toBe(0);

    await invokeMigration('down');
    const projectTables: Array<{ tableName: string }> = await dataSource.query(
      `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name LIKE 'project_checklist%'`,
    );
    const planningColumn: Array<{ columnName: string }> = await dataSource.query(
      `SELECT column_name AS "columnName" FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'planning_enabled'`,
    );
    expect(projectTables).toEqual([]);
    expect(planningColumn).toEqual([]);
  });

  async function invokeMigration(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const migration = new AddProjectChecklists1730000016000();
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
