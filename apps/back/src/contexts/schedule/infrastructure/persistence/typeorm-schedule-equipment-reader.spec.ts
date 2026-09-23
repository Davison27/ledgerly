import { DataSource } from 'typeorm';
import { TypeOrmScheduleEquipmentReader } from './typeorm-schedule-equipment-reader';

describe('TypeOrmScheduleEquipmentReader', () => {
  it('selects only equipment identifiers and display names for editor reads', async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const query = jest.fn((sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return Promise.resolve([{ id: 'equipment-1', displayName: 'Canopy' }]);
    });
    const reader = new TypeOrmScheduleEquipmentReader({ query } as unknown as DataSource);

    await expect(reader.findEditorOptions()).resolves.toEqual([{ id: 'equipment-1', displayName: 'Canopy' }]);
    await expect(reader.findEditorLabelsByIds(['equipment-1'])).resolves.toEqual([
      { id: 'equipment-1', displayName: 'Canopy' },
    ]);

    const selectorQuery = calls[0].sql;
    const labelQuery = calls[1].sql;
    expect(selectorQuery).toContain('WHERE archived_at IS NULL');
    expect(selectorQuery).toMatch(/SELECT\s+id,\s*name AS "displayName"/);
    expect(labelQuery).toMatch(/SELECT\s+id,\s*name AS "displayName"/);
    expect(`${selectorQuery} ${labelQuery}`).not.toMatch(/stock|price|image|reference|category|brand|description|tags/i);
    expect(labelQuery).not.toContain('archived_at');
    expect(calls[1].params).toEqual([['equipment-1']]);
  });

  it('does not query when no equipment IDs are requested', async () => {
    const query = jest.fn();
    const reader = new TypeOrmScheduleEquipmentReader({ query } as unknown as DataSource);

    await expect(reader.findEditorLabelsByIds([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
