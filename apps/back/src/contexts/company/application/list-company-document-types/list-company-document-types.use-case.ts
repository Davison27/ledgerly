import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_DOCUMENT_TYPE_REPOSITORY,
  CompanyDocumentTypeRepository,
} from '../../domain/company-document-type.repository';
import { CompanyDocumentType } from '../../domain/company-document-type';

@Injectable()
export class ListCompanyDocumentTypesUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_TYPE_REPOSITORY)
    private readonly companyDocumentTypeRepository: CompanyDocumentTypeRepository,
  ) {}

  execute(): Promise<CompanyDocumentType[]> {
    return this.companyDocumentTypeRepository.findAll();
  }
}
