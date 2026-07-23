import { detectScheduleConflicts } from './schedule-conflict-detector';
import { ScheduleEvent } from './schedule-event';
import { ScheduleEventView } from './schedule-event-view';
import { ScheduleProjectView } from './schedule-project-reader.port';
import { ScheduleStaffView } from './schedule-staff-reader.port';
import { ScheduleProductView } from './schedule-product-reader.port';

const RANGE = { from: '2026-07-01', to: '2026-07-31' };

const ACTIVE_PROJECT: ScheduleProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: null,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

const HIRED_STAFF: ScheduleStaffView = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'García',
  hireDate: '2026-01-01',
  endDate: null,
};

function buildView(
  overrides: Partial<{
    event: ScheduleEvent;
    project: ScheduleProjectView;
    staff: ScheduleStaffView[];
    products: Array<ScheduleProductView & { quantity: number }>;
  }> = {},
): ScheduleEventView {
  return {
    event:
      overrides.event ??
      ScheduleEvent.create({
        id: 'event-1',
        projectId: 'project-1',
        days: [{ date: '2026-07-10', startTime: null, endTime: null }],
        staffMemberIds: ['staff-1'],
      }),
    project: overrides.project ?? ACTIVE_PROJECT,
    staff: overrides.staff ?? [HIRED_STAFF],
    products: overrides.products ?? [],
  };
}

describe('detectScheduleConflicts', () => {
  it('flags staff_not_hired when the worker is hired after the event day', () => {
    const view = buildView({
      staff: [{ ...HIRED_STAFF, hireDate: '2026-07-15' }],
    });

    const conflicts = detectScheduleConflicts([view], RANGE);

    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'staff_not_hired', eventId: 'event-1', staffMemberId: 'staff-1' }),
    );
  });

  it('flags outside_project_dates when the day falls outside the project range', () => {
    const view = buildView({
      event: ScheduleEvent.create({
        id: 'event-1',
        projectId: 'project-1',
        days: [{ date: '2026-08-05', startTime: null, endTime: null }],
      }),
    });

    const conflicts = detectScheduleConflicts([view], { from: '2026-07-01', to: '2026-08-31' });

    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'outside_project_dates', eventId: 'event-1', date: '2026-08-05' }),
    );
  });

  it('flags staff_overlap for both events when the same worker has overlapping time ranges the same day', () => {
    const eventA = ScheduleEvent.create({
      id: 'event-a',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '08:00', endTime: '12:00' }],
      staffMemberIds: ['staff-1'],
    });
    const eventB = ScheduleEvent.create({
      id: 'event-b',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '10:00', endTime: '14:00' }],
      staffMemberIds: ['staff-1'],
    });

    const conflicts = detectScheduleConflicts(
      [buildView({ event: eventA }), buildView({ event: eventB })],
      RANGE,
    );

    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'staff_overlap', eventId: 'event-a', relatedEventId: 'event-b' }),
    );
    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'staff_overlap', eventId: 'event-b', relatedEventId: 'event-a' }),
    );
  });

  it('does not flag staff_overlap when the same day has disjoint time ranges', () => {
    const eventA = ScheduleEvent.create({
      id: 'event-a',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '08:00', endTime: '10:00' }],
      staffMemberIds: ['staff-1'],
    });
    const eventB = ScheduleEvent.create({
      id: 'event-b',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '10:00', endTime: '12:00' }],
      staffMemberIds: ['staff-1'],
    });

    const conflicts = detectScheduleConflicts(
      [buildView({ event: eventA }), buildView({ event: eventB })],
      RANGE,
    );

    expect(conflicts).toEqual([]);
  });

  it('flags project_not_active once per event when the project is not active', () => {
    const view = buildView({ project: { ...ACTIVE_PROJECT, status: 'on_hold' } });

    const conflicts = detectScheduleConflicts([view], RANGE);

    expect(conflicts.filter((conflict) => conflict.kind === 'project_not_active')).toHaveLength(1);
    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'project_not_active', eventId: 'event-1', date: null }),
    );
  });

  it('flags product_overallocated when the summed quantity exceeds stock on an overlapping day', () => {
    const eventA = ScheduleEvent.create({
      id: 'event-a',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: null, endTime: null }],
      products: [{ productId: 'product-1', quantity: 6 }],
    });
    const eventB = ScheduleEvent.create({
      id: 'event-b',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: null, endTime: null }],
      products: [{ productId: 'product-1', quantity: 6 }],
    });
    const productView = { id: 'product-1', name: 'Carpa', stock: 10, quantity: 6 };

    const conflicts = detectScheduleConflicts(
      [
        buildView({ event: eventA, products: [productView] }),
        buildView({ event: eventB, products: [productView] }),
      ],
      RANGE,
    );

    expect(conflicts).toContainEqual(
      expect.objectContaining({
        kind: 'product_overallocated',
        eventId: 'event-a',
        productId: 'product-1',
        stock: 10,
        allocated: 12,
        severity: 'error',
      }),
    );
  });

  it('flags product_stock_unset as an info-level conflict when stock is zero', () => {
    const event = ScheduleEvent.create({
      id: 'event-1',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: null, endTime: null }],
      products: [{ productId: 'product-1', quantity: 3 }],
    });

    const conflicts = detectScheduleConflicts(
      [buildView({ event, products: [{ id: 'product-1', name: 'Carpa', stock: 0, quantity: 3 }] })],
      RANGE,
    );

    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'product_stock_unset', severity: 'info', productId: 'product-1' }),
    );
    expect(conflicts.some((conflict) => conflict.kind === 'product_overallocated')).toBe(false);
  });

  it('ignores days that fall outside the requested range', () => {
    const event = ScheduleEvent.create({
      id: 'event-1',
      projectId: 'project-1',
      days: [{ date: '2026-09-01', startTime: null, endTime: null }],
    });

    const conflicts = detectScheduleConflicts([buildView({ event, project: { ...ACTIVE_PROJECT, status: 'on_hold' } })], RANGE);

    expect(conflicts).toEqual([]);
  });
});
