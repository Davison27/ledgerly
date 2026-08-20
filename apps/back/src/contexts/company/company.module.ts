import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateCompanyDocumentUseCase } from './application/create-company-document/create-company-document.use-case';
import { DeleteCompanyDocumentUseCase } from './application/delete-company-document/delete-company-document.use-case';
import { GetCompanyDocumentFileUseCase } from './application/get-company-document-file/get-company-document-file.use-case';
import { GetCompanyUseCase } from './application/get-company/get-company.use-case';
import { GetCompanyBrandingUseCase } from './application/get-company-branding/get-company-branding.use-case';
import { ListCompanyDocumentTypesUseCase } from './application/list-company-document-types/list-company-document-types.use-case';
import { ListCompanyDocumentsUseCase } from './application/list-company-documents/list-company-documents.use-case';
import { UpdateCompanyUseCase } from './application/update-company/update-company.use-case';
import { UpdateCompanyDocumentUseCase } from './application/update-company-document/update-company-document.use-case';
import { COMPANY_DOCUMENT_REPOSITORY } from './domain/company-document.repository';
import { COMPANY_DOCUMENT_TYPE_REPOSITORY } from './domain/company-document-type.repository';
import { COMPANY_REPOSITORY } from './domain/company.repository';
import { CompanyController } from './infrastructure/http/company.controller';
import { CompanyDocumentsController } from './infrastructure/http/company-documents.controller';
import { CompanyDocumentTypesController } from './infrastructure/http/company-document-types.controller';
import { CompanyDocumentOrmEntity } from './infrastructure/persistence/company-document.orm-entity';
import { CompanyDocumentTypeCatalogInitializer } from './infrastructure/persistence/company-document-type-catalog.initializer';
import { CompanyDocumentTypeOrmEntity } from './infrastructure/persistence/company-document-type.orm-entity';
import { CompanyOrmEntity } from './infrastructure/persistence/company.orm-entity';
import { TypeOrmCompanyDocumentRepository } from './infrastructure/persistence/typeorm-company-document.repository';
import { TypeOrmCompanyDocumentTypeRepository } from './infrastructure/persistence/typeorm-company-document-type.repository';
import { TypeOrmCompanyRepository } from './infrastructure/persistence/typeorm-company.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyOrmEntity, CompanyDocumentOrmEntity, CompanyDocumentTypeOrmEntity])],
  controllers: [CompanyController, CompanyDocumentsController, CompanyDocumentTypesController],
  providers: [
    GetCompanyUseCase,
    UpdateCompanyUseCase,
    GetCompanyBrandingUseCase,
    ListCompanyDocumentTypesUseCase,
    ListCompanyDocumentsUseCase,
    CreateCompanyDocumentUseCase,
    UpdateCompanyDocumentUseCase,
    DeleteCompanyDocumentUseCase,
    GetCompanyDocumentFileUseCase,
    CompanyDocumentTypeCatalogInitializer,
    {
      provide: COMPANY_REPOSITORY,
      useClass: TypeOrmCompanyRepository,
    },
    {
      provide: COMPANY_DOCUMENT_REPOSITORY,
      useClass: TypeOrmCompanyDocumentRepository,
    },
    {
      provide: COMPANY_DOCUMENT_TYPE_REPOSITORY,
      useClass: TypeOrmCompanyDocumentTypeRepository,
    },
  ],
})
export class CompanyModule {}
