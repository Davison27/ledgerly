import { Injectable } from '@nestjs/common';
import { Clock } from '../domain/clock.port';

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return formatIsoDate(new Date());
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  todayIso(): string {
    return formatIsoDate(this.now());
  }
}
