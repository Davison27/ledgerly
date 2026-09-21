import { Inject, Injectable } from '@nestjs/common';
import { CLIENT_REFERENCE_COUNTER, ClientReferenceCounter } from '../../domain/client-reference-counter.port';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';

@Injectable()
export class DeleteClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository,
    @Inject(CLIENT_REFERENCE_COUNTER) private readonly clientReferenceCounter: ClientReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const client = await this.clientRepository.findById(id);
    if (client === null) throw new ClientNotFoundException(id);

    if (await this.clientReferenceCounter.count(id) > 0) {
      await this.clientRepository.archive(id);
      return 'archived';
    }

    await this.clientRepository.delete(id);
    return 'deleted';
  }
}
