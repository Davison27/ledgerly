import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { UpdateClientUseCase } from './update-client.use-case';

class InMemoryClientRepository implements ClientRepository {
  constructor(private readonly clients: Client[]) {}

  findAll(): Promise<Client[]> {
    return Promise.resolve(this.clients);
  }

  findById(id: string): Promise<Client | null> {
    return Promise.resolve(this.clients.find((client) => client.id === id) ?? null);
  }

  findByTaxId(taxId: string): Promise<Client | null> {
    return Promise.resolve(this.clients.find((client) => client.taxId === taxId) ?? null);
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

function buildClient(overrides: Partial<Parameters<typeof Client.create>[0]> = {}): Client {
  return Client.create({
    id: 'client-1',
    name: 'Acme SL',
    taxId: 'B12345678',
    contactName: 'Ada Lovelace',
    contactEmail: 'ada@example.com',
    contactPhone: '+34 600 000 000',
    ...overrides,
  });
}

describe('UpdateClientUseCase', () => {
  it('updates the supplied client fields', async () => {
    const client = buildClient();
    const useCase = new UpdateClientUseCase(new InMemoryClientRepository([client]));

    const updated = await useCase.execute({
      id: client.id,
      name: 'Acme Updated SL',
      taxId: 'B87654321',
      contactName: 'Grace Hopper',
      contactEmail: 'grace@example.com',
      contactPhone: '+34 611 111 111',
    });

    expect(updated.toPrimitives()).toEqual({
      id: 'client-1',
      name: 'Acme Updated SL',
      taxId: 'B87654321',
      contactName: 'Grace Hopper',
      contactEmail: 'grace@example.com',
      contactPhone: '+34 611 111 111',
    });
  });

  it('rejects an unknown client', async () => {
    const useCase = new UpdateClientUseCase(new InMemoryClientRepository([]));

    await expect(useCase.execute({ id: 'missing-client', name: 'Missing' })).rejects.toThrow(ClientNotFoundException);
  });

  it('rejects a tax id used by another client', async () => {
    const current = buildClient();
    const other = buildClient({ id: 'client-2', taxId: 'B87654321' });
    const useCase = new UpdateClientUseCase(new InMemoryClientRepository([current, other]));

    await expect(useCase.execute({ id: current.id, taxId: 'B87654321' })).rejects.toThrow(ClientTaxIdAlreadyExistsException);
  });

  it('does not treat a formatted equivalent tax ID as a change', async () => {
    const current = buildClient();
    const repository = new InMemoryClientRepository([current]);
    const useCase = new UpdateClientUseCase(repository);

    await expect(useCase.execute({ id: current.id, taxId: ' b-123.456 78 ' })).resolves.toBe(current);
    expect(current.taxId).toBe('B12345678');
  });
});
