import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ListClientsUseCase } from './list-clients.use-case';

class InMemoryClientRepository implements ClientRepository {
  constructor(private readonly clients: Client[]) {}

  findAll(): Promise<Client[]> {
    return Promise.resolve(this.clients);
  }

  findById(): Promise<Client | null> {
    return Promise.resolve(null);
  }

  findByTaxId(): Promise<Client | null> {
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

function buildClient(id: string, name: string): Client {
  return Client.create({
    id,
    name,
    taxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
  });
}

describe('ListClientsUseCase', () => {
  it('returns every client from the repository', async () => {
    const clients = [buildClient('client-1', 'Acme SL'), buildClient('client-2', 'Beta SL')];
    const useCase = new ListClientsUseCase(new InMemoryClientRepository(clients));

    await expect(useCase.execute()).resolves.toEqual(clients);
  });
});
