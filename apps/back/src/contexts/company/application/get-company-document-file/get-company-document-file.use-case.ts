import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_DOCUMENT_REPOSITORY,
  CompanyDocumentRepository,
} from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';

export interface CompanyDocumentFileResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class GetCompanyDocumentFileUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_REPOSITORY)
    private readonly companyDocumentRepository: CompanyDocumentRepository,
  ) {}

  async execute(documentId: string): Promise<CompanyDocumentFileResult | null> {
    const document = await this.companyDocumentRepository.findById(documentId);
    if (document === null) {
      throw new CompanyDocumentNotFoundException(documentId);
    }

    const content = await this.companyDocumentRepository.findContent(documentId);
    if (content === null) {
      return null;
    }

    return {
      content,
      fileName: document.getFileName(),
      mimeType: document.getMimeType(),
    };
  }
}
