import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventOrmEntity } from './schedule-event.orm-entity';
import { ScheduleEventDayOrmEntity } from './schedule-event-day.orm-entity';
import { ScheduleEventStaffOrmEntity } from './schedule-event-staff.orm-entity';
import { ScheduleEventProductOrmEntity } from './schedule-event-product.orm-entity';

function normalizeTime(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5);
}

export class ScheduleEventMapper {
  static toDomain(
    orm: ScheduleEventOrmEntity,
    dayOrms: ScheduleEventDayOrmEntity[],
    staffOrms: ScheduleEventStaffOrmEntity[],
    productOrms: ScheduleEventProductOrmEntity[],
  ): ScheduleEvent {
    return ScheduleEvent.create({
      id: orm.id,
      projectId: orm.projectId,
      title: orm.title,
      notes: orm.notes,
      days: dayOrms.map((day) => ({
        date: day.date,
        startTime: normalizeTime(day.startTime),
        endTime: normalizeTime(day.endTime),
      })),
      staffMemberIds: staffOrms.map((staff) => staff.staffMemberId),
      products: productOrms.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
    });
  }

  static toOrm(event: ScheduleEvent): ScheduleEventOrmEntity {
    const orm = new ScheduleEventOrmEntity();

    orm.id = event.id;
    orm.projectId = event.projectId;
    orm.title = event.title;
    orm.notes = event.notes;

    return orm;
  }

  static daysToOrm(event: ScheduleEvent, dayIds: string[]): ScheduleEventDayOrmEntity[] {
    return event.days.map((day, index) => {
      const orm = new ScheduleEventDayOrmEntity();

      orm.id = dayIds[index];
      orm.eventId = event.id;
      orm.date = day.date;
      orm.startTime = day.startTime;
      orm.endTime = day.endTime;

      return orm;
    });
  }

  static staffToOrm(event: ScheduleEvent): ScheduleEventStaffOrmEntity[] {
    return event.staffMemberIds.map((staffMemberId) => {
      const orm = new ScheduleEventStaffOrmEntity();

      orm.eventId = event.id;
      orm.staffMemberId = staffMemberId;

      return orm;
    });
  }

  static productsToOrm(event: ScheduleEvent): ScheduleEventProductOrmEntity[] {
    return event.products.map((product) => {
      const orm = new ScheduleEventProductOrmEntity();

      orm.eventId = event.id;
      orm.productId = product.productId;
      orm.quantity = product.quantity;

      return orm;
    });
  }
}
