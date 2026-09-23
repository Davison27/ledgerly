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
  const dayRepository = { find: jest.fn().mockResolvedValue([]) };
  const staffRepository = { find: jest.fn().mockResolvedValue([]) };
  const equipmentRepository = { find: jest.fn().mockResolvedValue([]) };
  const repository = new TypeOrmScheduleEventRepository(
    {} as DataSource,
    eventRepository as unknown as Repository<ScheduleEventOrmEntity>,
    dayRepository as unknown as Repository<ScheduleEventDayOrmEntity>,
    staffRepository as unknown as Repository<ScheduleEventStaffOrmEntity>,
    equipmentRepository as unknown as Repository<ScheduleEventEquipmentOrmEntity>,
    { generate: () => 'generated-id' },
  );

  return { query, repository, dayRepository, staffRepository, equipmentRepository };
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

  it('retains staff and equipment link IDs when the editor board reads schedule events', async () => {
    const { query, repository, dayRepository, staffRepository, equipmentRepository } = createRepository();
    query.getMany.mockResolvedValue([
      { id: 'event-1', projectId: 'project-1', title: 'Setup', notes: null },
    ]);
    dayRepository.find.mockResolvedValue([
      { eventId: 'event-1', date: '2026-07-03', startTime: '08:00:00', endTime: '14:00:00' },
    ]);
    staffRepository.find.mockResolvedValue([{ eventId: 'event-1', staffMemberId: 'staff-1' }]);
    equipmentRepository.find.mockResolvedValue([
      { eventId: 'event-1', equipmentId: 'equipment-1', quantity: 2 },
    ]);

    const [event] = await repository.findByFilter({ from: '2026-07-01', to: '2026-07-31' });

    expect(event.staffMemberIds).toEqual(['staff-1']);
    expect(event.equipment).toEqual([{ equipmentId: 'equipment-1', quantity: 2 }]);
    expect(query.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('NOT EXISTS'));
  });
});
