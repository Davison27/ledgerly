import { Global, Module } from '@nestjs/common';
import { ID_GENERATOR } from './domain/id-generator.port';
import { UuidGenerator } from './infrastructure/uuid-generator';
import { CLOCK } from './domain/clock.port';
import { SystemClock } from './infrastructure/system-clock';
import { DOMAIN_EVENT_PUBLISHER } from './domain/domain-event-publisher.port';
import { InProcessDomainEventPublisher } from './infrastructure/in-process-domain-event-publisher';

@Global()
@Module({
  providers: [
    { provide: ID_GENERATOR, useClass: UuidGenerator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: InProcessDomainEventPublisher },
  ],
  exports: [ID_GENERATOR, CLOCK, DOMAIN_EVENT_PUBLISHER],
})
export class SharedModule {}
