import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';

@Injectable()
export class DeleteDocumentUseCase {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
