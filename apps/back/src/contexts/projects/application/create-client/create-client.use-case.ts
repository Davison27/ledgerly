import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { Client } from '../../domain/client';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { CreateClientCommand } from './create-client.command';

@Injectable()
export class CreateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateClientCommand): Promise<Client> {
    const taxId = command.taxId ?? null;
    if (taxId !== null && await this.clientRepository.findByTaxId(taxId) !== null) {
      throw new ClientTaxIdAlreadyExistsException(taxId);
    }

    const client = Client.create({
      id: this.idGenerator.generate(),
      name: command.name,
      taxId,
      contactName: command.contactName ?? null,
      contactEmail: command.contactEmail ?? null,
      contactPhone: command.contactPhone ?? null,
    });
    await this.clientRepository.save(client);

    return client;
  }
}
