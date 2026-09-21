import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/client';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientTaxIdAlreadyExistsException } from '../../domain/errors/client-tax-id-already-exists.exception';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { normalizeTaxId } from '../../../../shared/domain/tax-id';
import { UpdateClientCommand } from './update-client.command';

@Injectable()
export class UpdateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(command: UpdateClientCommand): Promise<Client> {
    const client = await this.clientRepository.findById(command.id);
    if (client === null) throw new ClientNotFoundException(command.id);

    const taxId = command.taxId === undefined ? undefined : normalizeTaxId(command.taxId);

    if (taxId !== undefined && taxId !== client.taxId && taxId !== null) {
      const existing = await this.clientRepository.findByTaxId(taxId);
      if (existing !== null) throw new ClientTaxIdAlreadyExistsException(taxId);
    }

    if (command.name !== undefined) client.rename(command.name);
    if (taxId !== undefined) client.changeTaxId(taxId);
    if (command.contactName !== undefined) client.changeContactName(command.contactName);
    if (command.contactEmail !== undefined) client.changeContactEmail(command.contactEmail);
    if (command.contactPhone !== undefined) client.changeContactPhone(command.contactPhone);
    await this.clientRepository.save(client);

    return client;
  }
}
