import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';

@Injectable()
export class GetDocumentUseCase {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository) {}

  async execute(id: string): Promise<Document> {
    const document = await this.repository.findById(id);

    if (!document) {
      throw new DocumentNotFoundException(id);
    }

    return document;
  }
}
