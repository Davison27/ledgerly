import { Inject, Injectable } from '@nestjs/common';
import { CompanyDocument } from '../../domain/company-document';
import {
  COMPANY_DOCUMENT_REPOSITORY,
  CompanyDocumentRepository,
} from '../../domain/company-document.repository';
import {
  COMPANY_DOCUMENT_TYPE_REPOSITORY,
  CompanyDocumentTypeRepository,
} from '../../domain/company-document-type.repository';
import { CompanyDocumentTypeNotFoundException } from '../../domain/errors/company-document-type-not-found.exception';

@Injectable()
export class ListCompanyDocumentsUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_REPOSITORY)
    private readonly companyDocumentRepository: CompanyDocumentRepository,
    @Inject(COMPANY_DOCUMENT_TYPE_REPOSITORY)
    private readonly companyDocumentTypeRepository: CompanyDocumentTypeRepository,
  ) {}

  async execute(typeId?: string): Promise<CompanyDocument[]> {
    if (typeId !== undefined && (await this.companyDocumentTypeRepository.findById(typeId)) === null) {
      throw new CompanyDocumentTypeNotFoundException(typeId);
    }

    return this.companyDocumentRepository.findAll(typeId);
  }
}
