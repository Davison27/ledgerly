import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { GetClientUseCase } from './get-client.use-case';

class InMemoryClientRepository implements ClientRepository {
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
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
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

describe('GetClientUseCase', () => {
  it('returns the requested client', async () => {
    const client = buildClient();
    const useCase = new GetClientUseCase(new InMemoryClientRepository(client));

    await expect(useCase.execute(client.id)).resolves.toBe(client);
  });

  it('rejects an unknown client', async () => {
    const useCase = new GetClientUseCase(new InMemoryClientRepository(null));

    await expect(useCase.execute('missing-client')).rejects.toThrow(ClientNotFoundException);
  });
});
