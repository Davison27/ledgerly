import { InProcessDomainEventPublisher } from './in-process-domain-event-publisher';
import { DomainEvent } from '../domain/domain-event';
import { DomainEventSubscriber } from '../domain/domain-event-publisher.port';

function buildSubscriber(
  overrides: Partial<{ subscribedTo: string[]; handle: (event: DomainEvent) => Promise<void> }> = {},
): DomainEventSubscriber {
  return {
    subscribedTo: () => overrides.subscribedTo ?? [],
    handle: overrides.handle ?? jest.fn().mockResolvedValue(undefined),
  };
}

describe('InProcessDomainEventPublisher', () => {
  it('delivers events only to subscribers registered to the event name', async () => {
    const publisher = new InProcessDomainEventPublisher();
    const matchingHandle = jest.fn().mockResolvedValue(undefined);
    const otherHandle = jest.fn().mockResolvedValue(undefined);
    publisher.register(buildSubscriber({ subscribedTo: ['document.created'], handle: matchingHandle }));
    publisher.register(buildSubscriber({ subscribedTo: ['document.deleted'], handle: otherHandle }));
    const event: DomainEvent = { name: 'document.created' };

    await publisher.publish([event]);

    expect(matchingHandle).toHaveBeenCalledWith(event);
    expect(otherHandle).not.toHaveBeenCalled();
  });

  it('keeps running the remaining handlers when one of them throws', async () => {
    const publisher = new InProcessDomainEventPublisher();
    const failingHandle = jest.fn().mockRejectedValue(new Error('boom'));
    const survivingHandle = jest.fn().mockResolvedValue(undefined);
    publisher.register(buildSubscriber({ subscribedTo: ['document.created'], handle: failingHandle }));
    publisher.register(buildSubscriber({ subscribedTo: ['document.created'], handle: survivingHandle }));
    const event: DomainEvent = { name: 'document.created' };

    await publisher.publish([event]);

    expect(failingHandle).toHaveBeenCalledWith(event);
    expect(survivingHandle).toHaveBeenCalledWith(event);
  });
});
