import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';

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

  async execute(
    staffDocumentId: string,
    staffMemberId?: string,
  ): Promise<StaffDocumentFileResult | null> {
    const staffDocument = await this.staffDocumentRepository.findById(staffDocumentId, staffMemberId);

    if (!staffDocument) {
      if (staffMemberId !== undefined) {
        throw new StaffDocumentNotFoundException();
      }

      return null;
    }

    const content = await this.staffDocumentRepository.findContent(staffDocumentId, staffMemberId);

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
