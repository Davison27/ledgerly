export const WEEK_BAR_HEIGHT = 96;

export type StaffContentMode = 'none' | 'avatars' | 'chips';

export interface EventContentDensity {
  showSchedule: boolean;
  staffMode: StaffContentMode;
  maxStaff: number;
  maxEquipment: number;
}

export function eventContentDensity(height: number, span: number): EventContentDensity {
  if (height < 34) {
    return { showSchedule: false, staffMode: 'none', maxStaff: 0, maxEquipment: 0 };
  }

  if (height < 56) {
    return { showSchedule: true, staffMode: 'none', maxStaff: 0, maxEquipment: 0 };
  }

  if (height < 88) {
    return { showSchedule: true, staffMode: 'avatars', maxStaff: 3, maxEquipment: 0 };
  }

  return {
    showSchedule: true,
    staffMode: 'chips',
    maxStaff: span >= 2 ? 4 : 2,
    maxEquipment: height >= 132 ? 4 : 2,
  };
}
