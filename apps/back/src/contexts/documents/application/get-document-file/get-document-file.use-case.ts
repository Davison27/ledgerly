import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';

export interface DocumentFileResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class GetDocumentFileUseCase {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository) {}

  async execute(documentId: string): Promise<DocumentFileResult | null> {
    const document = await this.repository.findById(documentId);
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
