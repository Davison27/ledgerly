import { QueryFailedError, Repository } from 'typeorm';
import { Client } from '../../domain/client';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { TypeOrmClientRepository } from './typeorm-client.repository';
import { ClientOrmEntity } from './client.orm-entity';

function buildClient(): Client {
  return Client.create({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Client',
    taxId: 'B12345678',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
  });
}

function queryFailure(code: string, constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT INTO clients', [], { code, constraint } as unknown as Error);
}

describe('TypeOrmClientRepository.save', () => {
  it('maps the tax-ID unique violation to a domain conflict', async () => {
    const save = jest.fn().mockRejectedValue(queryFailure('23505', 'UQ_clients_tax_id'));
    const repository = new TypeOrmClientRepository({ save } as unknown as Repository<ClientOrmEntity>);

    await expect(repository.save(buildClient())).rejects.toEqual(
      new ClientTaxIdAlreadyExistsException('B12345678'),
    );
  });

  it('rethrows unrelated unique violations', async () => {
    const error = queryFailure('23505', 'UQ_clients_other');
    const save = jest.fn().mockRejectedValue(error);
    const repository = new TypeOrmClientRepository({ save } as unknown as Repository<ClientOrmEntity>);

    await expect(repository.save(buildClient())).rejects.toBe(error);
  });

  it('rethrows non-unique failures', async () => {
    const error = queryFailure('23503', 'FK_clients_other');
    const save = jest.fn().mockRejectedValue(error);
    const repository = new TypeOrmClientRepository({ save } as unknown as Repository<ClientOrmEntity>);

    await expect(repository.save(buildClient())).rejects.toBe(error);
  });
});
