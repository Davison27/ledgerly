import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetCompanyUseCase } from './application/get-company/get-company.use-case';
import { GetCompanyBrandingUseCase } from './application/get-company-branding/get-company-branding.use-case';
import { UpdateCompanyUseCase } from './application/update-company/update-company.use-case';
import { COMPANY_REPOSITORY } from './domain/company.repository';
import { CompanyController } from './infrastructure/http/company.controller';
import { CompanyOrmEntity } from './infrastructure/persistence/company.orm-entity';
import { TypeOrmCompanyRepository } from './infrastructure/persistence/typeorm-company.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyOrmEntity])],
  controllers: [CompanyController],
  providers: [
    GetCompanyUseCase,
    UpdateCompanyUseCase,
    GetCompanyBrandingUseCase,
    {
      provide: COMPANY_REPOSITORY,
      useClass: TypeOrmCompanyRepository,
    },
  ],
})
export class CompanyModule {}
