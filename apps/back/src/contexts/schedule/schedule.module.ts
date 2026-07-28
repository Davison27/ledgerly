import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEventOrmEntity } from './infrastructure/persistence/schedule-event.orm-entity';
import { ScheduleEventDayOrmEntity } from './infrastructure/persistence/schedule-event-day.orm-entity';
import { ScheduleEventStaffOrmEntity } from './infrastructure/persistence/schedule-event-staff.orm-entity';
import { ScheduleEventProductOrmEntity } from './infrastructure/persistence/schedule-event-product.orm-entity';
import { TypeOrmScheduleEventRepository } from './infrastructure/persistence/typeorm-schedule-event.repository';
import { TypeOrmScheduleProjectReader } from './infrastructure/persistence/typeorm-schedule-project-reader';
import { TypeOrmScheduleStaffReader } from './infrastructure/persistence/typeorm-schedule-staff-reader';
import { TypeOrmScheduleProductReader } from './infrastructure/persistence/typeorm-schedule-product-reader';
import { ScheduleController } from './infrastructure/http/schedule.controller';
import { SCHEDULE_EVENT_REPOSITORY } from './domain/schedule-event.repository';
import { SCHEDULE_PROJECT_READER } from './domain/schedule-project-reader.port';
import { SCHEDULE_STAFF_READER } from './domain/schedule-staff-reader.port';
import { SCHEDULE_PRODUCT_READER } from './domain/schedule-product-reader.port';
import { CreateScheduleEventUseCase } from './application/create-schedule-event/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from './application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from './application/delete-schedule-event/delete-schedule-event.use-case';
import { ListScheduleEventsUseCase } from './application/list-schedule-events/list-schedule-events.use-case';
import { GetScheduleBoardUseCase } from './application/get-schedule-board/get-schedule-board.use-case';
import { ListSchedulableProjectsUseCase } from './application/list-schedulable-projects/list-schedulable-projects.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduleEventOrmEntity,
      ScheduleEventDayOrmEntity,
      ScheduleEventStaffOrmEntity,
      ScheduleEventProductOrmEntity,
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
    { provide: SCHEDULE_PRODUCT_READER, useClass: TypeOrmScheduleProductReader },
  ],
  exports: [GetScheduleBoardUseCase],
})
export class ScheduleModule {}
