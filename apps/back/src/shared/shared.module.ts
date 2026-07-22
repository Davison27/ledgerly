import { Global, Module } from '@nestjs/common';
import { ID_GENERATOR } from './domain/id-generator.port';
import { UuidGenerator } from './infrastructure/uuid-generator';
import { CLOCK } from './domain/clock.port';
import { SystemClock } from './infrastructure/system-clock';

@Global()
@Module({
  providers: [
    { provide: ID_GENERATOR, useClass: UuidGenerator },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [ID_GENERATOR, CLOCK],
})
export class SharedModule {}
