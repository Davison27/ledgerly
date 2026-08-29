import { describe, expect, it } from 'vitest';
import { eventContentDensity } from './eventDensity';

describe('eventContentDensity', () => {
  it('hides content in very short event bars', () => {
    expect(eventContentDensity(33, 1)).toEqual({
      showSchedule: false,
      staffMode: 'none',
      maxStaff: 0,
      maxEquipment: 0,
    });
  });

  it('uses avatars before switching to dense chips', () => {
    expect(eventContentDensity(56, 1)).toEqual({
      showSchedule: true,
      staffMode: 'avatars',
      maxStaff: 3,
      maxEquipment: 0,
    });
    expect(eventContentDensity(88, 1)).toEqual({
      showSchedule: true,
      staffMode: 'chips',
      maxStaff: 2,
      maxEquipment: 2,
    });
    expect(eventContentDensity(132, 2)).toMatchObject({ maxStaff: 4, maxEquipment: 4 });
  });
});
