import { Client } from '../../domain/client';
import { ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { UnarchiveClientUseCase } from './unarchive-client.use-case';

function buildClient(): Client {
  return Client.create({
    id: 'client-1',
    name: 'Acme SL',
    taxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    archivedAt: '2026-01-01T00:00:00.000Z',
  });
}

describe('UnarchiveClientUseCase', () => {
  it('clears the archive marker for an existing client', async () => {
    const unarchive = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findById: jest.fn().mockResolvedValue(buildClient()),
      unarchive,
    } as unknown as ClientRepository;
    const useCase = new UnarchiveClientUseCase(repository);

    await useCase.execute('client-1');

    expect(unarchive).toHaveBeenCalledWith('client-1');
  });

  it('rejects an unknown client', async () => {
    const unarchive = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      unarchive,
    } as unknown as ClientRepository;
    const useCase = new UnarchiveClientUseCase(repository);

    await expect(useCase.execute('missing-client')).rejects.toThrow(ClientNotFoundException);
    expect(unarchive).not.toHaveBeenCalled();
  });
});
