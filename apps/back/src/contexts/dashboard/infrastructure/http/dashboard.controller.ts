import { Controller, Get, Query } from '@nestjs/common';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { GetCompanyDashboardUseCase } from '../../application/get-company-dashboard/get-company-dashboard.use-case';
import { CompanyDashboardResponse } from './company-dashboard.response';
import { GetCompanyDashboardQueryDto } from './dtos/get-company-dashboard.query.dto';

interface DashboardMemberAccess {
  canAccess(module: 'projects' | 'documents' | 'suppliers' | 'staff' | 'equipment', level: 'view'): boolean;
}

@RequiresAccess('dashboard', 'view')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getCompanyDashboardUseCase: GetCompanyDashboardUseCase) {}

  @Get()
  async get(
    @Query() query: GetCompanyDashboardQueryDto,
    @CurrentMember() member: DashboardMemberAccess,
  ): Promise<CompanyDashboardResponse> {
    const result = await this.getCompanyDashboardUseCase.execute(
      {
        projects: member.canAccess('projects', 'view'),
        documents: member.canAccess('documents', 'view'),
        suppliers: member.canAccess('suppliers', 'view'),
        staff: member.canAccess('staff', 'view'),
        equipment: member.canAccess('equipment', 'view'),
      },
      query.year,
    );

    return CompanyDashboardResponse.fromResult(result);
  }
}
