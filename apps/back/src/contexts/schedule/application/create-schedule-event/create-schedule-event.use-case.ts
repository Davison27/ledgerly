import { Inject, Injectable } from '@nestjs/common';
import { ScheduleEvent } from '../../domain/schedule-event';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectReader,
} from '../../domain/schedule-project-reader.port';
import { SCHEDULE_STAFF_READER, ScheduleStaffReader } from '../../domain/schedule-staff-reader.port';
import {
  SCHEDULE_PRODUCT_READER,
  ScheduleProductReader,
} from '../../domain/schedule-product-reader.port';
import { buildScheduleEventViews, ScheduleEventView } from '../../domain/schedule-event-view';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleStaffMemberNotFoundException } from '../../domain/errors/schedule-staff-member-not-found.exception';
import { ScheduleProductNotFoundException } from '../../domain/errors/schedule-product-not-found.exception';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateScheduleEventCommand } from './create-schedule-event.command';

@Injectable()
export class CreateScheduleEventUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffReader,
    @Inject(SCHEDULE_PRODUCT_READER)
    private readonly productReader: ScheduleProductReader,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateScheduleEventCommand): Promise<ScheduleEventView> {
    const staffMemberIds = command.staffMemberIds ?? [];
    const productCommands = command.products ?? [];
    const productIds = productCommands.map((product) => product.productId);

    const [projects, staff, products] = await Promise.all([
      this.projectReader.findByIds([command.projectId]),
      this.staffReader.findByIds(staffMemberIds),
      this.productReader.findByIds(productIds),
    ]);

    const project = projects.find((candidate) => candidate.id === command.projectId);

    if (project === undefined) {
      throw new ScheduleProjectNotFoundException(command.projectId);
    }

    const missingStaffId = staffMemberIds.find((id) => !staff.some((member) => member.id === id));

    if (missingStaffId !== undefined) {
      throw new ScheduleStaffMemberNotFoundException(missingStaffId);
    }

    const missingProductId = productIds.find((id) => !products.some((product) => product.id === id));

    if (missingProductId !== undefined) {
      throw new ScheduleProductNotFoundException(missingProductId);
    }

    const event = ScheduleEvent.create({
      id: this.idGenerator.generate(),
      projectId: command.projectId,
      title: command.title,
      notes: command.notes,
      days: command.days.map((day) => ({
        date: day.date,
        startTime: day.startTime ?? null,
        endTime: day.endTime ?? null,
      })),
      staffMemberIds,
      products: productCommands,
    });

    await this.scheduleEventRepository.save(event);

    return buildScheduleEventViews([event], { projects, staff, products })[0];
  }
}
