import { Controller, Get } from '@nestjs/common';
import { GetCompanyDashboardUseCase } from '../../application/get-company-dashboard/get-company-dashboard.use-case';
import { CompanyDashboardResponse } from './company-dashboard.response';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getCompanyDashboardUseCase: GetCompanyDashboardUseCase) {}

  @Get()
  async get(): Promise<CompanyDashboardResponse> {
    const result = await this.getCompanyDashboardUseCase.execute();

    return CompanyDashboardResponse.fromResult(result);
  }
}
