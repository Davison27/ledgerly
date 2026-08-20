import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../domain/domain-event';
import { DomainEventPublisher, DomainEventSubscriber } from '../domain/domain-event-publisher.port';

@Injectable()
export class InProcessDomainEventPublisher implements DomainEventPublisher {
  private readonly logger = new Logger(InProcessDomainEventPublisher.name);
  private readonly subscribers: DomainEventSubscriber[] = [];

  register(subscriber: DomainEventSubscriber): void {
    this.subscribers.push(subscriber);
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const subscriber of this.subscribers) {
        if (!subscriber.subscribedTo().includes(event.name)) {
          continue;
        }

        try {
          await subscriber.handle(event);
        } catch {
          this.logger.error('Event handler failed');
        }
      }
    }
  }
}
