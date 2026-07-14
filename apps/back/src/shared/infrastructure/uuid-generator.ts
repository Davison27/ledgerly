import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../domain/id-generator.port';

@Injectable()
export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
