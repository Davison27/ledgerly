import { Controller, Get, Query } from '@nestjs/common';
import { GetCompanyDashboardUseCase } from '../../application/get-company-dashboard/get-company-dashboard.use-case';
import { CompanyDashboardResponse } from './company-dashboard.response';
import { GetCompanyDashboardQueryDto } from './dtos/get-company-dashboard.query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getCompanyDashboardUseCase: GetCompanyDashboardUseCase) {}

  @Get()
  async get(@Query() query: GetCompanyDashboardQueryDto): Promise<CompanyDashboardResponse> {
    const result = await this.getCompanyDashboardUseCase.execute(query.year);

    return CompanyDashboardResponse.fromResult(result);
  }
}
