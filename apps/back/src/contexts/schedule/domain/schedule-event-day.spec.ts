import { ScheduleEventDay } from './schedule-event-day';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

describe('ScheduleEventDay', () => {
  it('creates a full day with no time range', () => {
    const day = ScheduleEventDay.create({ date: '2026-07-03', startTime: null, endTime: null });

    expect(day.isFullDay()).toBe(true);
  });

  it('creates a day with a time range', () => {
    const day = ScheduleEventDay.create({ date: '2026-07-03', startTime: '08:00', endTime: '14:00' });

    expect(day.isFullDay()).toBe(false);
  });

  it('throws when the date does not match YYYY-MM-DD', () => {
    expect(() =>
      ScheduleEventDay.create({ date: '03-07-2026', startTime: null, endTime: null }),
    ).toThrow(InvalidValueException);
  });

  it('throws when only startTime is present', () => {
    expect(() =>
      ScheduleEventDay.create({ date: '2026-07-03', startTime: '08:00', endTime: null }),
    ).toThrow(InvalidValueException);
  });

  it('throws when only endTime is present', () => {
    expect(() =>
      ScheduleEventDay.create({ date: '2026-07-03', startTime: null, endTime: '14:00' }),
    ).toThrow(InvalidValueException);
  });

  it('throws when startTime does not match HH:mm', () => {
    expect(() =>
      ScheduleEventDay.create({ date: '2026-07-03', startTime: '8:00', endTime: '14:00' }),
    ).toThrow(InvalidValueException);
  });

  it('throws when endTime is not after startTime', () => {
    expect(() =>
      ScheduleEventDay.create({ date: '2026-07-03', startTime: '14:00', endTime: '14:00' }),
    ).toThrow(InvalidValueException);
  });

  describe('overlapsWith', () => {
    it('is false when the dates differ', () => {
      const dayA = ScheduleEventDay.create({ date: '2026-07-03', startTime: null, endTime: null });
      const dayB = ScheduleEventDay.create({ date: '2026-07-04', startTime: null, endTime: null });

      expect(dayA.overlapsWith(dayB)).toBe(false);
    });

    it('is true when either day is a full day on the same date', () => {
      const fullDay = ScheduleEventDay.create({ date: '2026-07-03', startTime: null, endTime: null });
      const timedDay = ScheduleEventDay.create({ date: '2026-07-03', startTime: '08:00', endTime: '10:00' });

      expect(fullDay.overlapsWith(timedDay)).toBe(true);
      expect(timedDay.overlapsWith(fullDay)).toBe(true);
    });

    it('is true when the time ranges intersect', () => {
      const dayA = ScheduleEventDay.create({ date: '2026-07-03', startTime: '08:00', endTime: '12:00' });
      const dayB = ScheduleEventDay.create({ date: '2026-07-03', startTime: '10:00', endTime: '14:00' });

      expect(dayA.overlapsWith(dayB)).toBe(true);
    });

    it('is false when the time ranges are disjoint on the same date', () => {
      const dayA = ScheduleEventDay.create({ date: '2026-07-03', startTime: '08:00', endTime: '10:00' });
      const dayB = ScheduleEventDay.create({ date: '2026-07-03', startTime: '10:00', endTime: '12:00' });

      expect(dayA.overlapsWith(dayB)).toBe(false);
    });
  });
});
