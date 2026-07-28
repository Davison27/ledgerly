import { DomainEvent } from './domain-event';

export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');

export interface DomainEventSubscriber {
  subscribedTo(): string[];
  handle(event: DomainEvent): Promise<void>;
}

export interface DomainEventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
  register(subscriber: DomainEventSubscriber): void;
}
