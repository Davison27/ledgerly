import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from '../documents/infrastructure/persistence/document.orm-entity';
import { TypeOrmDocumentRepository } from '../documents/infrastructure/persistence/typeorm-document.repository';
import { DOCUMENT_REPOSITORY } from '../documents/domain/document.repository';
import { ProjectOrmEntity } from '../projects/infrastructure/persistence/project.orm-entity';
import { TypeOrmProjectRepository } from '../projects/infrastructure/persistence/typeorm-project.repository';
import { PROJECT_REPOSITORY } from '../projects/domain/project.repository';
import { DashboardController } from './infrastructure/http/dashboard.controller';
import { GetCompanyDashboardUseCase } from './application/get-company-dashboard/get-company-dashboard.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentOrmEntity, ProjectOrmEntity])],
  controllers: [DashboardController],
  providers: [
    GetCompanyDashboardUseCase,
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
  ],
})
export class DashboardModule {}
