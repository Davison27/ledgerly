import { Inject, Injectable } from '@nestjs/common';
import { StaffDocument } from '../../domain/staff-document';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import {
  STAFF_DOCUMENT_TYPE_REPOSITORY,
  StaffDocumentTypeRepository,
} from '../../domain/staff-document-type.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';
import { StaffDocumentTypeNotFoundException } from '../../domain/errors/staff-document-type-not-found.exception';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateStaffDocumentCommand } from './create-staff-document.command';

@Injectable()
export class CreateStaffDocumentUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_REPOSITORY)
    private readonly staffDocumentRepository: StaffDocumentRepository,
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(STAFF_DOCUMENT_TYPE_REPOSITORY)
    private readonly staffDocumentTypeRepository: StaffDocumentTypeRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateStaffDocumentCommand): Promise<StaffDocument> {
    const staffMember = await this.staffMemberRepository.findById(command.staffMemberId);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(command.staffMemberId);
    }

    const type = await this.staffDocumentTypeRepository.findById(command.typeId);

    if (type === null) {
      throw new StaffDocumentTypeNotFoundException(command.typeId);
    }

    const staffDocument = StaffDocument.create({
      id: this.idGenerator.generate(),
      staffMemberId: command.staffMemberId,
      typeId: command.typeId,
      name: command.name,
      issueDate: command.issueDate,
      expiryDate: command.expiryDate ?? null,
      notes: command.notes ?? null,
      fileName: command.file.originalName,
      mimeType: command.file.mimeType,
      fileSize: command.file.size,
    });

    await this.staffDocumentRepository.save(staffDocument);
    await this.staffDocumentRepository.saveContent(staffDocument.getId(), command.file.buffer);

    return staffDocument;
  }
}
