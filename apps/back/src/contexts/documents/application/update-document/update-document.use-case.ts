import { Inject, Injectable } from '@nestjs/common';
import { Document, DocumentProps } from '../../domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { DocumentStaffMemberNotFoundException } from '../../domain/errors/document-staff-member-not-found.exception';
import {
  SUPPLIER_EXISTENCE_CHECKER,
  SupplierExistenceChecker,
} from '../../domain/supplier-existence-checker.port';
import {
  STAFF_MEMBER_EXISTENCE_CHECKER,
  StaffMemberExistenceChecker,
} from '../../domain/staff-member-existence-checker.port';
import { UpdateDocumentCommand } from './update-document.command';

type DocumentChanges = Partial<Omit<DocumentProps, 'id' | 'projectId'>>;

@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository,
    @Inject(SUPPLIER_EXISTENCE_CHECKER)
    private readonly supplierExistenceChecker: SupplierExistenceChecker,
    @Inject(STAFF_MEMBER_EXISTENCE_CHECKER)
    private readonly staffMemberExistenceChecker: StaffMemberExistenceChecker,
  ) {}

  async execute(command: UpdateDocumentCommand): Promise<Document> {
    const document = await this.repository.findById(command.id);

    if (!document) {
      throw new DocumentNotFoundException(command.id);
    }

    if (command.supplierId !== undefined && command.supplierId !== null) {
      const supplierExists = await this.supplierExistenceChecker.exists(command.supplierId);

      if (!supplierExists) {
        throw new DocumentSupplierNotFoundException(command.supplierId);
      }
    }

    if (command.staffMemberId !== undefined && command.staffMemberId !== null) {
      const staffMemberExists = await this.staffMemberExistenceChecker.exists(command.staffMemberId);

      if (!staffMemberExists) {
        throw new DocumentStaffMemberNotFoundException(command.staffMemberId);
      }
    }

    const changes: DocumentChanges = {};

    if (command.name !== undefined) changes.name = command.name;
    if (command.type !== undefined) changes.type = command.type;
    if (command.direction !== undefined) changes.direction = command.direction;
    if (command.status !== undefined) changes.status = command.status;
    if (command.date !== undefined) changes.date = command.date;
    if (command.dueDate !== undefined) changes.dueDate = command.dueDate;
    if (command.amount !== undefined) changes.amount = command.amount;
    if (command.taxBase !== undefined) changes.taxBase = command.taxBase;
    if (command.taxRate !== undefined) changes.taxRate = command.taxRate;
    if (command.taxAmount !== undefined) changes.taxAmount = command.taxAmount;
    if (command.irpfRate !== undefined) changes.irpfRate = command.irpfRate;
    if (command.irpfAmount !== undefined) changes.irpfAmount = command.irpfAmount;
    if (command.currency !== undefined) changes.currency = command.currency;
    if (command.issuerName !== undefined) changes.issuerName = command.issuerName;
    if (command.issuerTaxId !== undefined) changes.issuerTaxId = command.issuerTaxId;
    if (command.invoiceNumber !== undefined) changes.invoiceNumber = command.invoiceNumber;
    if (command.supplierId !== undefined) changes.supplierId = command.supplierId;
    if (command.staffMemberId !== undefined) changes.staffMemberId = command.staffMemberId;

    if (command.date !== undefined) {
      changes.month = Number(command.date.slice(5, 7));
    }

    const updated = document.withChanges(changes);
    await this.repository.save(updated);

    return updated;
  }
}
