import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectOrmEntity } from './infrastructure/persistence/project.orm-entity';
import { TypeOrmProjectRepository } from './infrastructure/persistence/typeorm-project.repository';
import { TypeOrmDemoProjectPurger } from './infrastructure/persistence/typeorm-demo-project-purger';
import { ProjectsController } from './infrastructure/http/projects.controller';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { DEMO_PROJECT_PURGER } from './domain/demo-project-purger.port';
import { ListProjectsUseCase } from './application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from './application/get-project/get-project.use-case';
import { CreateProjectUseCase } from './application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from './application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from './application/delete-project/delete-project.use-case';
import { ProductsModule } from '../products/products.module';
import { ProjectProductOrmEntity } from './infrastructure/persistence/project-product.orm-entity';
import { TypeOrmProjectProductRepository } from './infrastructure/persistence/typeorm-project-product.repository';
import { PROJECT_PRODUCT_REPOSITORY } from './domain/project-product.repository';
import { ProjectProductsUseCase } from './application/project-products/project-products.use-case';
import { ProjectProductsController } from './infrastructure/http/project-products.controller';
import { PROJECT_FINANCIALS_PROVIDER } from './domain/project-financials-provider.port';
import { TypeOrmProjectFinancialsProvider } from './infrastructure/persistence/typeorm-project-financials-provider';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectOrmEntity, ProjectProductOrmEntity]), ProductsModule],
  controllers: [ProjectsController, ProjectProductsController],
  providers: [
    ListProjectsUseCase,
    GetProjectUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    ProjectProductsUseCase,
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: DEMO_PROJECT_PURGER, useClass: TypeOrmDemoProjectPurger },
    { provide: PROJECT_PRODUCT_REPOSITORY, useClass: TypeOrmProjectProductRepository },
    { provide: PROJECT_FINANCIALS_PROVIDER, useClass: TypeOrmProjectFinancialsProvider },
  ],
})
export class ProjectsModule {}
