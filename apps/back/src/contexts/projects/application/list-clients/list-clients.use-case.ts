import { Inject, Injectable } from '@nestjs/common';
import { ClientSummary } from '../../domain/client-summary';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@Injectable()
export class ListClientsUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  execute(): Promise<ClientSummary[]> {
    return this.clientRepository.findAllSummaries();
  }
}
