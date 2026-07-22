import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';

@Injectable()
export class DeleteStaffDocumentUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_REPOSITORY)
    private readonly staffDocumentRepository: StaffDocumentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const staffDocument = await this.staffDocumentRepository.findById(id);

    if (staffDocument === null) {
      throw new StaffDocumentNotFoundException(id);
    }

    await this.staffDocumentRepository.delete(id);
  }
}
