export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function resolveGreetingPeriod(hour: number = new Date().getHours()): GreetingPeriod {
  if (hour < 12) return 'morning';
  if (hour < 20) return 'afternoon';
  return 'evening';
}
