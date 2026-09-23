import { DataSource } from 'typeorm';
import { TypeOrmScheduleStaffReader } from './typeorm-schedule-staff-reader';

describe('TypeOrmScheduleStaffReader', () => {
  it('selects only staff identifiers and display names for editor reads', async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const query = jest.fn((sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return Promise.resolve([{ id: 'staff-1', displayName: 'Ana García' }]);
    });
    const reader = new TypeOrmScheduleStaffReader({ query } as unknown as DataSource);

    await expect(reader.findEditorOptions()).resolves.toEqual([{ id: 'staff-1', displayName: 'Ana García' }]);
    await expect(reader.findEditorLabelsByIds(['staff-1'])).resolves.toEqual([
      { id: 'staff-1', displayName: 'Ana García' },
    ]);

    const selectorQuery = calls[0].sql;
    const labelQuery = calls[1].sql;
    expect(selectorQuery).toContain('WHERE archived_at IS NULL');
    expect(selectorQuery).toMatch(/SELECT\s+id,\s*first_name \|\| ' ' \|\| last_name AS "displayName"/);
    expect(labelQuery).toMatch(/SELECT\s+id,\s*first_name \|\| ' ' \|\| last_name AS "displayName"/);
    expect(`${selectorQuery} ${labelQuery}`).not.toMatch(/hire_date|end_date|tax_id|email|phone|position|notes/i);
    expect(labelQuery).not.toContain('archived_at');
    expect(calls[1].params).toEqual([['staff-1']]);
  });

  it('does not query when no staff IDs are requested', async () => {
    const query = jest.fn();
    const reader = new TypeOrmScheduleStaffReader({ query } as unknown as DataSource);

    await expect(reader.findEditorLabelsByIds([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
