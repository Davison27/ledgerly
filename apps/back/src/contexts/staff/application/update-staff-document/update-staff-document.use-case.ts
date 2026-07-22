import { Inject, Injectable } from '@nestjs/common';
import { StaffDocument, StaffDocumentProps } from '../../domain/staff-document';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';
import { UpdateStaffDocumentCommand } from './update-staff-document.command';

type StaffDocumentChanges = Partial<
  Omit<StaffDocumentProps, 'id' | 'staffMemberId' | 'typeId' | 'fileName' | 'mimeType' | 'fileSize'>
>;

@Injectable()
export class UpdateStaffDocumentUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_REPOSITORY)
    private readonly staffDocumentRepository: StaffDocumentRepository,
  ) {}

  async execute(command: UpdateStaffDocumentCommand): Promise<StaffDocument> {
    const staffDocument = await this.staffDocumentRepository.findById(command.id);

    if (staffDocument === null) {
      throw new StaffDocumentNotFoundException(command.id);
    }

    const changes: StaffDocumentChanges = {};

    if (command.name !== undefined) changes.name = command.name;
    if (command.issueDate !== undefined) changes.issueDate = command.issueDate;
    if (command.expiryDate !== undefined) changes.expiryDate = command.expiryDate;
    if (command.notes !== undefined) changes.notes = command.notes;

    const updated = staffDocument.withChanges(changes);
    await this.staffDocumentRepository.save(updated);

    return updated;
  }
}
