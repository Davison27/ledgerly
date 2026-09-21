import { Inject, Injectable } from '@nestjs/common';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';

@Injectable()
export class UnarchiveClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(id: string): Promise<void> {
    const client = await this.clientRepository.findById(id);
    if (client === null) throw new ClientNotFoundException(id);
    if (this.clientRepository.unarchive === undefined) throw new Error('Client repository does not support unarchiving');
    await this.clientRepository.unarchive(id);
  }
}
