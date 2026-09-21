import { DeleteClientUseCase } from './delete-client.use-case';
import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientReferenceCounter } from '../../domain/client-reference-counter.port';

class InMemoryClientRepository implements ClientRepository {
  archiveCalls = 0;
  deleteCalls = 0;

  constructor(private readonly client: Client | null) {}

  findAll(): Promise<Client[]> {
    return Promise.resolve(this.client === null ? [] : [this.client]);
  }

  findById(): Promise<Client | null> {
    return Promise.resolve(this.client);
  }

  findByTaxId(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  archive(): Promise<void> {
    this.archiveCalls += 1;
    return Promise.resolve();
  }

  delete(): Promise<void> {
    this.deleteCalls += 1;
    return Promise.resolve();
  }
}

class FixedReferenceCounter implements ClientReferenceCounter {
  constructor(private readonly references: number) {}

  count(): Promise<number> {
    return Promise.resolve(this.references);
  }
}

function buildClient(): Client {
  return Client.create({
    id: 'client-1',
    name: 'Acme SL',
    taxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
  });
}

describe('DeleteClientUseCase', () => {
  it('archives a referenced client', async () => {
    const repository = new InMemoryClientRepository(buildClient());
    const useCase = new DeleteClientUseCase(repository, new FixedReferenceCounter(1));

    await expect(useCase.execute('client-1')).resolves.toBe('archived');
    expect(repository.archiveCalls).toBe(1);
    expect(repository.deleteCalls).toBe(0);
  });

  it('deletes an unreferenced client', async () => {
    const repository = new InMemoryClientRepository(buildClient());
    const useCase = new DeleteClientUseCase(repository, new FixedReferenceCounter(0));

    await expect(useCase.execute('client-1')).resolves.toBe('deleted');
    expect(repository.archiveCalls).toBe(0);
    expect(repository.deleteCalls).toBe(1);
  });
});
