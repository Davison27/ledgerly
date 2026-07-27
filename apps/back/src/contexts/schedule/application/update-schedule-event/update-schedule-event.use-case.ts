import { Inject, Injectable } from '@nestjs/common';
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
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleStaffMemberNotFoundException } from '../../domain/errors/schedule-staff-member-not-found.exception';
import { ScheduleProductNotFoundException } from '../../domain/errors/schedule-product-not-found.exception';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../../shared/domain/domain-event-publisher.port';
import { ScheduleEventSavedEvent } from '../../domain/events/schedule-event-saved.event';
import { UpdateScheduleEventCommand } from './update-schedule-event.command';

@Injectable()
export class UpdateScheduleEventUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffReader,
    @Inject(SCHEDULE_PRODUCT_READER)
    private readonly productReader: ScheduleProductReader,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: UpdateScheduleEventCommand): Promise<ScheduleEventView> {
    const event = await this.scheduleEventRepository.findById(command.id);

    if (event === null) {
      throw new ScheduleEventNotFoundException(command.id);
    }

    const projectId = command.projectId ?? event.projectId;
    const staffMemberIds = command.staffMemberIds ?? event.staffMemberIds;
    const productIds = (command.products ?? event.products).map((product) => product.productId);

    const [projects, staff, products] = await Promise.all([
      this.projectReader.findByIds([projectId]),
      this.staffReader.findByIds(staffMemberIds),
      this.productReader.findByIds(productIds),
    ]);

    const project = projects.find((candidate) => candidate.id === projectId);

    if (project === undefined) {
      throw new ScheduleProjectNotFoundException(projectId);
    }

    if (command.staffMemberIds !== undefined) {
      const missingStaffId = command.staffMemberIds.find(
        (id) => !staff.some((member) => member.id === id),
      );

      if (missingStaffId !== undefined) {
        throw new ScheduleStaffMemberNotFoundException(missingStaffId);
      }
    }

    if (command.products !== undefined) {
      const missingProductId = command.products.find(
        (product) => !products.some((candidate) => candidate.id === product.productId),
      )?.productId;

      if (missingProductId !== undefined) {
        throw new ScheduleProductNotFoundException(missingProductId);
      }
    }

    const updated = event.withChanges({
      projectId: command.projectId,
      title: command.title,
      notes: command.notes,
      days: command.days?.map((day) => ({
        date: day.date,
        startTime: day.startTime ?? null,
        endTime: day.endTime ?? null,
      })),
      staffMemberIds: command.staffMemberIds,
      products: command.products,
    });

    await this.scheduleEventRepository.save(updated);

    await this.eventPublisher.publish([
      new ScheduleEventSavedEvent({ eventId: updated.id, dates: updated.days.map((day) => day.date) }),
    ]);

    return buildScheduleEventViews([updated], { projects, staff, products })[0];
  }
}
