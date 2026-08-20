import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_DOCUMENT_REPOSITORY,
  CompanyDocumentRepository,
} from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';

@Injectable()
export class DeleteCompanyDocumentUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_REPOSITORY)
    private readonly companyDocumentRepository: CompanyDocumentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.companyDocumentRepository.delete(id);
    if (!deleted) {
      throw new CompanyDocumentNotFoundException(id);
    }
  }
}
