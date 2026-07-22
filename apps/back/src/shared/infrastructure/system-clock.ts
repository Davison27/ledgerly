import { Injectable } from '@nestjs/common';
import { Clock } from '../domain/clock.port';

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Free-standing helper for call sites that need today's date but have no
 * constructor to receive `Clock` through DI: static response mappers
 * (`DocumentResponse.fromDomain`, `DocumentListItemResponse.fromResult`) and
 * the TypeORM repository's query-builder helpers. Domain and application
 * code must go through the injected `Clock` port instead (see
 * `shared/domain/clock.port.ts`) so they stay deterministic under test.
 */
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
