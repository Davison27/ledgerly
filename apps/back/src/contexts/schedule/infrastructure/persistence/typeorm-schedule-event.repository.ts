import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ScheduleEvent } from '../../domain/schedule-event';
import {
  ScheduleEventFilter,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { ScheduleEventOrmEntity } from './schedule-event.orm-entity';
import { ScheduleEventDayOrmEntity } from './schedule-event-day.orm-entity';
import { ScheduleEventStaffOrmEntity } from './schedule-event-staff.orm-entity';
import { ScheduleEventEquipmentOrmEntity } from './schedule-event-equipment.orm-entity';
import { ScheduleEventMapper } from './schedule-event.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmScheduleEventRepository implements ScheduleEventRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ScheduleEventOrmEntity)
    private readonly eventRepository: Repository<ScheduleEventOrmEntity>,
    @InjectRepository(ScheduleEventDayOrmEntity)
    private readonly dayRepository: Repository<ScheduleEventDayOrmEntity>,
    @InjectRepository(ScheduleEventStaffOrmEntity)
    private readonly staffRepository: Repository<ScheduleEventStaffOrmEntity>,
    @InjectRepository(ScheduleEventEquipmentOrmEntity)
    private readonly equipmentRepository: Repository<ScheduleEventEquipmentOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async findById(id: string): Promise<ScheduleEvent | null> {
    const orm = await this.eventRepository.findOne({ where: { id } });

    if (orm === null) {
      return null;
    }

    const [days, staff, equipment] = await Promise.all([
      this.dayRepository.find({ where: { eventId: id } }),
      this.staffRepository.find({ where: { eventId: id } }),
      this.equipmentRepository.find({ where: { eventId: id } }),
    ]);

    return ScheduleEventMapper.toDomain(orm, days, staff, equipment);
  }

  async findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .orderBy(
        '(SELECT MIN(day.date) FROM schedule_event_days day WHERE day.event_id = event.id)',
        'ASC',
      )
      .addOrderBy('event.id', 'ASC');

    if (filter.projectId !== undefined) {
      query.andWhere('event.project_id = :projectId', { projectId: filter.projectId });
    }

    if (filter.from !== undefined) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM schedule_event_days day WHERE day.event_id = event.id AND day.date >= :from)',
        { from: filter.from },
      );
    }

    if (filter.to !== undefined) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM schedule_event_days day WHERE day.event_id = event.id AND day.date <= :to)',
        { to: filter.to },
      );
    }

    if (filter.staffMemberId !== undefined) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM schedule_event_staff staff WHERE staff.event_id = event.id AND staff.staff_member_id = :staffMemberId)',
        { staffMemberId: filter.staffMemberId },
      );
    }

    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const eventOrms = await query.take(limit + 1).getMany();

    if (eventOrms.length > limit) throw new ListLimitExceededException(limit, 'Schedule events');

    if (eventOrms.length === 0) {
      return [];
    }

    const ids = eventOrms.map((orm) => orm.id);

    const [days, staff, equipment] = await Promise.all([
      this.dayRepository.find({ where: { eventId: In(ids) } }),
      this.staffRepository.find({ where: { eventId: In(ids) } }),
      this.equipmentRepository.find({ where: { eventId: In(ids) } }),
    ]);

    return eventOrms.map((orm) =>
      ScheduleEventMapper.toDomain(
        orm,
        days.filter((day) => day.eventId === orm.id),
        staff.filter((member) => member.eventId === orm.id),
        equipment.filter((equipment) => equipment.eventId === orm.id),
      ),
    );
  }

  async save(event: ScheduleEvent): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ScheduleEventOrmEntity).save(ScheduleEventMapper.toOrm(event));

      await manager.getRepository(ScheduleEventDayOrmEntity).delete({ eventId: event.id });
      await manager.getRepository(ScheduleEventStaffOrmEntity).delete({ eventId: event.id });
      await manager.getRepository(ScheduleEventEquipmentOrmEntity).delete({ eventId: event.id });

      const dayIds = event.days.map(() => this.idGenerator.generate());
      const dayOrms = ScheduleEventMapper.daysToOrm(event, dayIds);

      if (dayOrms.length > 0) {
        await manager.getRepository(ScheduleEventDayOrmEntity).insert(dayOrms);
      }

      const staffOrms = ScheduleEventMapper.staffToOrm(event);

      if (staffOrms.length > 0) {
        await manager.getRepository(ScheduleEventStaffOrmEntity).insert(staffOrms);
      }

      const equipmentOrms = ScheduleEventMapper.equipmentToOrm(event);

      if (equipmentOrms.length > 0) {
        await manager.getRepository(ScheduleEventEquipmentOrmEntity).insert(equipmentOrms);
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.eventRepository.delete({ id });
  }
}
