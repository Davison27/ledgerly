import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GetCompanyUseCase } from '../../application/get-company/get-company.use-case';
import { UpdateCompanyUseCase } from '../../application/update-company/update-company.use-case';
import { CompanyResponse } from './company.response';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly getCompanyUseCase: GetCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
  ) {}

  @Get()
  async getCompany(): Promise<CompanyResponse> {
    const company = await this.getCompanyUseCase.execute();
    return CompanyResponse.fromDomain(company);
  }

  @Patch()
  async update(@Body() dto: UpdateCompanyDto): Promise<CompanyResponse> {
    const company = await this.updateCompanyUseCase.execute(dto);
    return CompanyResponse.fromDomain(company);
  }
}
