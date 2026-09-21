import { DataSource } from 'typeorm';
import { TypeOrmEquipmentReferenceCounter } from './typeorm-equipment-reference-counter';

describe('TypeOrmEquipmentReferenceCounter', () => {
  it('counts project and schedule references', async () => {
    const query = jest.fn().mockResolvedValue([{ count: 2 }]);
    const counter = new TypeOrmEquipmentReferenceCounter({ query } as unknown as DataSource);

    await expect(counter.count('equipment-1')).resolves.toBe(2);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('project_equipment'), ['equipment-1']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('schedule_event_equipment'), ['equipment-1']);
  });
});
