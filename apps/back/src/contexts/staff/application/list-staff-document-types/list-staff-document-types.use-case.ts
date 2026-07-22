import { Inject, Injectable } from '@nestjs/common';
import { StaffDocumentType } from '../../domain/staff-document-type';
import {
  STAFF_DOCUMENT_TYPE_REPOSITORY,
  StaffDocumentTypeRepository,
} from '../../domain/staff-document-type.repository';

@Injectable()
export class ListStaffDocumentTypesUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_TYPE_REPOSITORY)
    private readonly staffDocumentTypeRepository: StaffDocumentTypeRepository,
  ) {}

  execute(): Promise<StaffDocumentType[]> {
    return this.staffDocumentTypeRepository.findAll();
  }
}
