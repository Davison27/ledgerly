import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { Public } from '../../../../shared/infrastructure/http/access/public.decorator';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { GetCompanyUseCase } from '../../application/get-company/get-company.use-case';
import { GetCompanyBrandingUseCase } from '../../application/get-company-branding/get-company-branding.use-case';
import { UpdateCompanyUseCase } from '../../application/update-company/update-company.use-case';
import { CompanyBrandingResponse } from './company-branding.response';
import { CompanyResponse } from './company.response';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Authenticated()
@Controller('company')
export class CompanyController {
  constructor(
    private readonly getCompanyUseCase: GetCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly getCompanyBrandingUseCase: GetCompanyBrandingUseCase,
  ) {}

  @Get()
  async getCompany(): Promise<CompanyResponse> {
    const company = await this.getCompanyUseCase.execute();
    return CompanyResponse.fromDomain(company);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('branding')
  async branding(): Promise<CompanyBrandingResponse> {
    const branding = await this.getCompanyBrandingUseCase.execute();
    return CompanyBrandingResponse.fromBranding(branding);
  }

  @RequiresAdmin()
  @Patch()
  async update(@Body() dto: UpdateCompanyDto): Promise<CompanyResponse> {
    const company = await this.updateCompanyUseCase.execute(dto);
    return CompanyResponse.fromDomain(company);
  }
}
