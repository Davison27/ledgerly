import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { DeleteDocumentCommand } from './delete-document.command';

@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteDocumentCommand): Promise<void> {
    const document = await this.repository.findById(command.id);

    if (!document || document.getProjectId() !== command.projectId) {
      throw new DocumentNotFoundException(command.id);
    }

    const deleted = await this.repository.softDelete(command.id, command.deletedBy, this.clock.now());

    if (!deleted) {
      throw new DocumentNotFoundException(command.id);
    }
  }
}
