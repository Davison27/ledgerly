import { Client } from '../../domain/client';
import { ClientSummary } from '../../domain/client-summary';
import { ClientRepository } from '../../domain/client.repository';
import { ListClientsUseCase } from './list-clients.use-case';

class InMemoryClientRepository implements ClientRepository {
  constructor(private readonly clients: Client[]) {}

  findAll(): Promise<Client[]> {
    return Promise.resolve(this.clients);
  }

  findAllSummaries(): Promise<ClientSummary[]> {
    return Promise.resolve(this.clients.map((client) => ({
      ...client.toPrimitives(),
      archivedAt: client.archivedAt,
      projectCount: 0,
    })));
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
  it('returns every client summary from the repository', async () => {
    const clients = [buildClient('client-1', 'Acme SL'), buildClient('client-2', 'Beta SL')];
    const useCase = new ListClientsUseCase(new InMemoryClientRepository(clients));

    await expect(useCase.execute()).resolves.toEqual([
      expect.objectContaining({ id: 'client-1', name: 'Acme SL', projectCount: 0 }),
      expect.objectContaining({ id: 'client-2', name: 'Beta SL', projectCount: 0 }),
    ]);
  });
});
