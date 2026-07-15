import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import {
  PROJECT_EXISTENCE_CHECKER,
  ProjectExistenceChecker,
} from '../../domain/project-existence-checker.port';
import { DocumentProjectNotFoundException } from '../../domain/errors/document-project-not-found.exception';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateDocumentCommand } from './create-document.command';

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository,
    @Inject(PROJECT_EXISTENCE_CHECKER) private readonly projectExistenceChecker: ProjectExistenceChecker,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateDocumentCommand): Promise<Document> {
    const projectExists = await this.projectExistenceChecker.exists(command.projectId);

    if (!projectExists) {
      throw new DocumentProjectNotFoundException(command.projectId);
    }

    const document = Document.create({
      id: this.idGenerator.generate(),
      projectId: command.projectId,
      name: command.name,
      type: command.type,
      month: command.month,
      date: command.date,
      amount: command.amount,
      status: command.status,
      issuerName: command.issuerName ?? null,
      issuerTaxId: command.issuerTaxId ?? null,
      invoiceNumber: command.invoiceNumber ?? null,
      dueDate: command.dueDate ?? null,
      taxBase: command.taxBase ?? null,
      taxRate: command.taxRate ?? null,
      taxAmount: command.taxAmount ?? null,
      currency: command.currency ?? 'EUR',
    });

    await this.repository.save(document);

    return document;
  }
}
