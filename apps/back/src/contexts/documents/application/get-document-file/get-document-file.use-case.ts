import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';

export interface DocumentFileResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class GetDocumentFileUseCase {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository) {}

  async execute(documentId: string, projectId?: string): Promise<DocumentFileResult | null> {
    const document = await this.repository.findById(documentId);

    if (document && projectId !== undefined && document.getProjectId() !== projectId) {
      throw new DocumentNotFoundException(documentId);
    }

    const fileName = document?.getFileName() ?? null;

    if (!document || fileName === null) {
      return null;
    }

    const content = await this.repository.findContent(documentId);

    if (!content) {
      return null;
    }

    return {
      content,
      fileName,
      mimeType: document.getMimeType() ?? 'application/pdf',
    };
  }
}
