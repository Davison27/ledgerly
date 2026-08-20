import { Controller, Get } from '@nestjs/common';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { ListCompanyDocumentTypesUseCase } from '../../application/list-company-document-types/list-company-document-types.use-case';
import { CompanyDocumentTypeResponse } from './company-document-type.response';

@RequiresAdmin()
@Controller('company')
export class CompanyDocumentTypesController {
  constructor(private readonly listCompanyDocumentTypesUseCase: ListCompanyDocumentTypesUseCase) {}

  @Get('document-types')
  async list(): Promise<CompanyDocumentTypeResponse[]> {
    const types = await this.listCompanyDocumentTypesUseCase.execute();

    return types.map((type) => CompanyDocumentTypeResponse.fromDomain(type));
  }
}
