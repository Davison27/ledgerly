import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventFilter,
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

@Injectable()
export class ListScheduleEventsUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffReader,
    @Inject(SCHEDULE_PRODUCT_READER)
    private readonly productReader: ScheduleProductReader,
  ) {}

  async execute(filter: ScheduleEventFilter): Promise<ScheduleEventView[]> {
    const events = await this.scheduleEventRepository.findByFilter(filter);

    const projectIds = [...new Set(events.map((event) => event.projectId))];
    const staffIds = [...new Set(events.flatMap((event) => event.staffMemberIds))];
    const productIds = [
      ...new Set(events.flatMap((event) => event.products.map((product) => product.productId))),
    ];

    const [projects, staff, products] = await Promise.all([
      this.projectReader.findByIds(projectIds),
      this.staffReader.findByIds(staffIds),
      this.productReader.findByIds(productIds),
    ]);

    return buildScheduleEventViews(events, { projects, staff, products });
  }
}
