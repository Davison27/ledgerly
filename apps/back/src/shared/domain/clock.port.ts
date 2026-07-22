export const CLOCK = Symbol('Clock');

export interface Clock {
  now(): Date;
  todayIso(): string;
}
