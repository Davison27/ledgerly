import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';

export interface StaffDocumentFileResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class GetStaffDocumentFileUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_REPOSITORY)
    private readonly staffDocumentRepository: StaffDocumentRepository,
  ) {}

  async execute(staffDocumentId: string): Promise<StaffDocumentFileResult | null> {
    const staffDocument = await this.staffDocumentRepository.findById(staffDocumentId);

    if (!staffDocument) {
      return null;
    }

    const content = await this.staffDocumentRepository.findContent(staffDocumentId);

    if (!content) {
      return null;
    }

    return {
      content,
      fileName: staffDocument.getFileName(),
      mimeType: staffDocument.getMimeType(),
    };
  }
}
