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
import { CompanyNotFoundException } from '../../domain/errors/company-not-found.exception';
import { CompanyDocumentTypeNotFoundException } from '../../domain/errors/company-document-type-not-found.exception';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/company.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateCompanyDocumentCommand } from './create-company-document.command';

@Injectable()
export class CreateCompanyDocumentUseCase {
  constructor(
    @Inject(COMPANY_DOCUMENT_REPOSITORY)
    private readonly companyDocumentRepository: CompanyDocumentRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(COMPANY_DOCUMENT_TYPE_REPOSITORY)
    private readonly companyDocumentTypeRepository: CompanyDocumentTypeRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateCompanyDocumentCommand): Promise<CompanyDocument> {
    const company = await this.companyRepository.find();
    if (company === null) {
      throw new CompanyNotFoundException();
    }

    const type = await this.companyDocumentTypeRepository.findById(command.typeId);
    if (type === null) {
      throw new CompanyDocumentTypeNotFoundException(command.typeId);
    }

    const document = CompanyDocument.create({
      id: this.idGenerator.generate(),
      typeId: command.typeId,
      name: command.name,
      issueDate: command.issueDate ?? null,
      expiryDate: command.expiryDate ?? null,
      notes: command.notes ?? null,
      fileName: command.file.originalName,
      mimeType: command.file.mimeType,
      fileSize: command.file.size,
    });

    await this.companyDocumentRepository.save(document);
    await this.companyDocumentRepository.saveContent(document.getId(), command.file.buffer);

    return document;
  }
}
