import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/client';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@Injectable()
export class ListClientsUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  execute(): Promise<Client[]> {
    return this.clientRepository.findAll();
  }
}
