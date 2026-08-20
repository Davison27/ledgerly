import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEventOrmEntity } from './infrastructure/persistence/schedule-event.orm-entity';
import { ScheduleEventDayOrmEntity } from './infrastructure/persistence/schedule-event-day.orm-entity';
import { ScheduleEventStaffOrmEntity } from './infrastructure/persistence/schedule-event-staff.orm-entity';
import { ScheduleEventEquipmentOrmEntity } from './infrastructure/persistence/schedule-event-equipment.orm-entity';
import { TypeOrmScheduleEventRepository } from './infrastructure/persistence/typeorm-schedule-event.repository';
import { TypeOrmScheduleProjectReader } from './infrastructure/persistence/typeorm-schedule-project-reader';
import { TypeOrmScheduleStaffReader } from './infrastructure/persistence/typeorm-schedule-staff-reader';
import { TypeOrmScheduleEquipmentReader } from './infrastructure/persistence/typeorm-schedule-equipment-reader';
import { ScheduleController } from './infrastructure/http/schedule.controller';
import { SCHEDULE_EVENT_REPOSITORY } from './domain/schedule-event.repository';
import { SCHEDULE_PROJECT_READER } from './domain/schedule-project-reader.port';
import { SCHEDULE_STAFF_READER } from './domain/schedule-staff-reader.port';
import { SCHEDULE_EQUIPMENT_READER } from './domain/schedule-equipment-reader.port';
import { CreateScheduleEventUseCase } from './application/create-schedule-event/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from './application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from './application/delete-schedule-event/delete-schedule-event.use-case';
import { ListScheduleEventsUseCase } from './application/list-schedule-events/list-schedule-events.use-case';
import { GetScheduleBoardUseCase } from './application/get-schedule-board/get-schedule-board.use-case';
import { ListSchedulableProjectsUseCase } from './application/list-schedulable-projects/list-schedulable-projects.use-case';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      ScheduleEventOrmEntity,
      ScheduleEventDayOrmEntity,
      ScheduleEventStaffOrmEntity,
      ScheduleEventEquipmentOrmEntity,
    ]),
  ],
  controllers: [ScheduleController],
  providers: [
    CreateScheduleEventUseCase,
    UpdateScheduleEventUseCase,
    DeleteScheduleEventUseCase,
    ListScheduleEventsUseCase,
    GetScheduleBoardUseCase,
    ListSchedulableProjectsUseCase,
    { provide: SCHEDULE_EVENT_REPOSITORY, useClass: TypeOrmScheduleEventRepository },
    { provide: SCHEDULE_PROJECT_READER, useClass: TypeOrmScheduleProjectReader },
    { provide: SCHEDULE_STAFF_READER, useClass: TypeOrmScheduleStaffReader },
    { provide: SCHEDULE_EQUIPMENT_READER, useClass: TypeOrmScheduleEquipmentReader },
  ],
  exports: [GetScheduleBoardUseCase],
})
export class ScheduleModule {}
