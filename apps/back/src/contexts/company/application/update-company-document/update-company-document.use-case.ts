import { Inject, Injectable } from '@nestjs/common';
import { CompanyDocument, CompanyDocumentProps } from '../../domain/company-document';
import {
  COMPANY_DOCUMENT_REPOSITORY,
  CompanyDocumentRepository,
} from '../../domain/company-document.repository';
import { CompanyDocumentNotFoundException } from '../../domain/errors/company-document-not-found.exception';
import { UpdateCompanyDocumentCommand } from './update-company-document.command';

type CompanyDocumentChanges = Partial<Pick<CompanyDocumentProps, 'name' | 'issueDate' | 'expiryDate' | 'notes'>>;

@Injectable()
export class UpdateCompanyDocumentUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_REPOSITORY)
    private readonly companyDocumentRepository: CompanyDocumentRepository,
  ) {}

  async execute(command: UpdateCompanyDocumentCommand): Promise<CompanyDocument> {
    const document = await this.companyDocumentRepository.findById(command.id);
    if (document === null) {
      throw new CompanyDocumentNotFoundException(command.id);
    }

    const changes: CompanyDocumentChanges = {};
    if (command.name !== undefined) changes.name = command.name;
    if (command.issueDate !== undefined) changes.issueDate = command.issueDate;
    if (command.expiryDate !== undefined) changes.expiryDate = command.expiryDate;
    if (command.notes !== undefined) changes.notes = command.notes;

    const updated = document.withChanges(changes);
    await this.companyDocumentRepository.save(updated);

    return updated;
  }
}
