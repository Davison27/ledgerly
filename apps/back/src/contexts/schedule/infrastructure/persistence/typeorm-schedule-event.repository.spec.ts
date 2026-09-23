import { DataSource, Repository } from 'typeorm';
import { ScheduleEventOrmEntity } from './schedule-event.orm-entity';
import { ScheduleEventDayOrmEntity } from './schedule-event-day.orm-entity';
import { ScheduleEventStaffOrmEntity } from './schedule-event-staff.orm-entity';
import { ScheduleEventEquipmentOrmEntity } from './schedule-event-equipment.orm-entity';
import { TypeOrmScheduleEventRepository } from './typeorm-schedule-event.repository';

function createRepository() {
  const query = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };
  const eventRepository = {
    createQueryBuilder: jest.fn(() => query),
  };
  const repository = new TypeOrmScheduleEventRepository(
    {} as DataSource,
    eventRepository as unknown as Repository<ScheduleEventOrmEntity>,
    {} as Repository<ScheduleEventDayOrmEntity>,
    {} as Repository<ScheduleEventStaffOrmEntity>,
    {} as Repository<ScheduleEventEquipmentOrmEntity>,
    { generate: () => 'generated-id' },
  );

  return { query, repository };
}

describe('TypeOrmScheduleEventRepository', () => {
  it('filters hidden staff and equipment assignments before applying the list limit', async () => {
    const { query, repository } = createRepository();

    await repository.findByFilter({ excludeStaffAssignments: true, excludeEquipmentAssignments: true });

    expect(query.andWhere).toHaveBeenNthCalledWith(
      1,
      'NOT EXISTS (SELECT 1 FROM schedule_event_staff staff WHERE staff.event_id = event.id)',
    );
    expect(query.andWhere).toHaveBeenNthCalledWith(
      2,
      'NOT EXISTS (SELECT 1 FROM schedule_event_equipment equipment WHERE equipment.event_id = event.id)',
    );
    expect(query.andWhere.mock.invocationCallOrder[1]).toBeLessThan(query.take.mock.invocationCallOrder[0]);
    expect(query.take).toHaveBeenCalledWith(expect.any(Number));
  });

  it('hides events with assignments in sections the member cannot view', async () => {
    const { query, repository } = createRepository();

    await expect(repository.findById('event-1', { staff: false, equipment: false })).resolves.toBeNull();

    expect(query.andWhere).toHaveBeenNthCalledWith(
      1,
      'NOT EXISTS (SELECT 1 FROM schedule_event_staff staff WHERE staff.event_id = event.id)',
    );
    expect(query.andWhere).toHaveBeenNthCalledWith(
      2,
      'NOT EXISTS (SELECT 1 FROM schedule_event_equipment equipment WHERE equipment.event_id = event.id)',
    );
  });
});
