import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { CreateClientUseCase } from './create-client.use-case';

class InMemoryClientRepository implements ClientRepository {
  private clients: Client[] = [];

  findAll(): Promise<Client[]> {
    return Promise.resolve([...this.clients]);
  }

  findById(id: string): Promise<Client | null> {
    return Promise.resolve(this.clients.find((client) => client.id === id) ?? null);
  }

  findByTaxId(taxId: string): Promise<Client | null> {
    return Promise.resolve(this.clients.find((client) => client.taxId === taxId) ?? null);
  }

  save(client: Client): Promise<void> {
    const index = this.clients.findIndex((existing) => existing.id === client.id);

    if (index === -1) {
      this.clients.push(client);
    } else {
      this.clients[index] = client;
    }

    return Promise.resolve();
  }

  archive(): Promise<void> {
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.clients = this.clients.filter((client) => client.id !== id);
    return Promise.resolve();
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

describe('CreateClientUseCase', () => {
  it('creates a client when the tax id is not taken', async () => {
    const repository = new InMemoryClientRepository();
    const useCase = new CreateClientUseCase(repository, new SequentialIdGenerator());

    const client = await useCase.execute({
      name: 'Acme SL',
      taxId: 'B12345678',
      contactName: 'Ada Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: '+34 600 000 000',
    });

    expect(client.id).toBe('generated-id-1');
    expect(client.toPrimitives()).toMatchObject({
      name: 'Acme SL',
      taxId: 'B12345678',
      contactName: 'Ada Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: '+34 600 000 000',
    });
    await expect(repository.findById(client.id)).resolves.toBe(client);
  });

  it('throws when the tax id is already used', async () => {
    const repository = new InMemoryClientRepository();
    const useCase = new CreateClientUseCase(repository, new SequentialIdGenerator());

    await useCase.execute({ name: 'Existing SL', taxId: 'B12345678' });

    await expect(
      useCase.execute({ name: 'Acme SL', taxId: 'B12345678' }),
    ).rejects.toThrow(ClientTaxIdAlreadyExistsException);

    await expect(repository.findAll()).resolves.toHaveLength(1);
  });
});
