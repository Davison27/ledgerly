import { ScheduleEvent } from './schedule-event';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PROPS = {
  id: 'event-1',
  projectId: 'project-1',
  title: 'Montaje',
  notes: 'Traer generador',
  days: [
    { date: '2026-07-04', startTime: null, endTime: null },
    { date: '2026-07-03', startTime: '08:00', endTime: '14:00' },
  ],
  staffMemberIds: ['staff-1', 'staff-2'],
  products: [{ productId: 'product-1', quantity: 2 }],
};

describe('ScheduleEvent', () => {
  it('creates a schedule event and sorts its days by date', () => {
    const event = ScheduleEvent.create(BASE_PROPS);

    expect(event.days.map((day) => day.date)).toEqual(['2026-07-03', '2026-07-04']);
  });

  it('derives startDate and endDate from the sorted days', () => {
    const event = ScheduleEvent.create(BASE_PROPS);

    expect(event.startDate).toBe('2026-07-03');
    expect(event.endDate).toBe('2026-07-04');
  });

  it('defaults optional fields when omitted', () => {
    const event = ScheduleEvent.create({
      id: 'event-2',
      projectId: 'project-1',
      days: [{ date: '2026-07-03', startTime: null, endTime: null }],
    });

    expect(event.title).toBeNull();
    expect(event.notes).toBeNull();
    expect(event.staffMemberIds).toEqual([]);
    expect(event.products).toEqual([]);
  });

  it('throws when there are no days', () => {
    expect(() => ScheduleEvent.create({ ...BASE_PROPS, days: [] })).toThrow(InvalidValueException);
  });

  it('throws when a date is repeated', () => {
    expect(() =>
      ScheduleEvent.create({
        ...BASE_PROPS,
        days: [
          { date: '2026-07-03', startTime: null, endTime: null },
          { date: '2026-07-03', startTime: null, endTime: null },
        ],
      }),
    ).toThrow(InvalidValueException);
  });

  it('throws when a staff member is repeated', () => {
    expect(() =>
      ScheduleEvent.create({ ...BASE_PROPS, staffMemberIds: ['staff-1', 'staff-1'] }),
    ).toThrow(InvalidValueException);
  });

  it('throws when a product is repeated', () => {
    expect(() =>
      ScheduleEvent.create({
        ...BASE_PROPS,
        products: [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-1', quantity: 2 },
        ],
      }),
    ).toThrow(InvalidValueException);
  });

  it('throws when a product quantity is not a positive integer', () => {
    expect(() =>
      ScheduleEvent.create({ ...BASE_PROPS, products: [{ productId: 'product-1', quantity: 0 }] }),
    ).toThrow(InvalidValueException);
  });

  it('throws when the title is longer than 120 characters', () => {
    expect(() => ScheduleEvent.create({ ...BASE_PROPS, title: 'a'.repeat(121) })).toThrow(
      InvalidValueException,
    );
  });

  it('withChanges replaces only the given fields and re-validates the result', () => {
    const event = ScheduleEvent.create(BASE_PROPS);

    const changed = event.withChanges({ title: 'Evento' });

    expect(changed.title).toBe('Evento');
    expect(changed.notes).toBe(BASE_PROPS.notes);
    expect(changed.days.map((day) => day.date)).toEqual(['2026-07-03', '2026-07-04']);
  });

  it('withChanges rejects an invalid replacement', () => {
    const event = ScheduleEvent.create(BASE_PROPS);

    expect(() => event.withChanges({ staffMemberIds: ['staff-1', 'staff-1'] })).toThrow(
      InvalidValueException,
    );
  });

  it('round-trips through toPrimitives/create', () => {
    const event = ScheduleEvent.create(BASE_PROPS);
    const restored = ScheduleEvent.create(event.toPrimitives());

    expect(restored.toPrimitives()).toEqual(event.toPrimitives());
  });
});
