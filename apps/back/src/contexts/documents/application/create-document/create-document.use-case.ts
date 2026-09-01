import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import {
  PROJECT_EXISTENCE_CHECKER,
  ProjectExistenceChecker,
} from '../../domain/project-existence-checker.port';
import {
  SUPPLIER_EXISTENCE_CHECKER,
  SupplierExistenceChecker,
} from '../../domain/supplier-existence-checker.port';
import { DocumentProjectNotFoundException } from '../../domain/errors/document-project-not-found.exception';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../../shared/domain/domain-event-publisher.port';
import { DocumentCreatedEvent } from '../../domain/events/document-created.event';
import { CreateDocumentCommand } from './create-document.command';
import { isCreatableDocumentType } from '../../domain/document-type';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository,
    @Inject(PROJECT_EXISTENCE_CHECKER) private readonly projectExistenceChecker: ProjectExistenceChecker,
    @Inject(SUPPLIER_EXISTENCE_CHECKER) private readonly supplierExistenceChecker: SupplierExistenceChecker,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: CreateDocumentCommand): Promise<Document> {
    if (
      !isCreatableDocumentType(command.type) ||
      Object.hasOwn(command, 'staffMemberId')
    ) {
      throw new InvalidValueException('Only invoice and tax documents can be created');
    }

    const projectExists = await this.projectExistenceChecker.exists(command.projectId);

    if (!projectExists) {
      throw new DocumentProjectNotFoundException(command.projectId);
    }

    const supplierId = command.supplierId ?? null;

    if (supplierId !== null) {
      const supplierExists = await this.supplierExistenceChecker.exists(supplierId);

      if (!supplierExists) {
        throw new DocumentSupplierNotFoundException(supplierId);
      }
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
      irpfRate: command.irpfRate ?? null,
      irpfAmount: command.irpfAmount ?? null,
      currency: command.currency ?? 'EUR',
      fileName: command.file?.originalName ?? null,
      mimeType: command.file?.mimeType ?? null,
      fileSize: command.file?.size ?? null,
      supplierId,
      direction: command.direction,
    });

    await this.repository.save(document);

    if (command.file) {
      await this.repository.saveContent(document.getId(), command.file.buffer);
    }

    await this.eventPublisher.publish([
      new DocumentCreatedEvent({
        documentId: document.getId(),
        projectId: document.getProjectId(),
        documentName: document.getName(),
        invoiceNumber: document.getInvoiceNumber(),
        issuerName: document.getIssuerName(),
        issuerTaxId: document.getIssuerTaxId(),
        amount: document.getAmount(),
      }),
    ]);

    return document;
  }
}
