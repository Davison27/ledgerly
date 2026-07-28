import { Controller, Get } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListStaffDocumentTypesUseCase } from '../../application/list-staff-document-types/list-staff-document-types.use-case';
import { StaffDocumentTypeResponse } from './staff-document-type.response';

@RequiresAccess('staff', 'view')
@Controller('staff-document-types')
export class StaffDocumentTypesController {
  constructor(private readonly listStaffDocumentTypesUseCase: ListStaffDocumentTypesUseCase) {}

  @Get()
  async list(): Promise<StaffDocumentTypeResponse[]> {
    const types = await this.listStaffDocumentTypesUseCase.execute();

    return types.map((type) => StaffDocumentTypeResponse.fromDomain(type));
  }
}
