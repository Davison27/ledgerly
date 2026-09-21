import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/client';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';

@Injectable()
export class GetClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (client === null) throw new ClientNotFoundException(id);
    return client;
  }
}
