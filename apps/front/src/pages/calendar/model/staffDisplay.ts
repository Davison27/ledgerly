export interface StaffDisplay<T> {
  visible: T[];
  hidden: T[];
}

export function staffDisplay<T>(staff: T[], limit: number): StaffDisplay<T> {
  return { visible: staff.slice(0, limit), hidden: staff.slice(limit) };
}
