import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectOrmEntity } from './infrastructure/persistence/project.orm-entity';
import { TypeOrmProjectRepository } from './infrastructure/persistence/typeorm-project.repository';
import { ProjectsController } from './infrastructure/http/projects.controller';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { ListProjectsUseCase } from './application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from './application/get-project/get-project.use-case';
import { CreateProjectUseCase } from './application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from './application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from './application/delete-project/delete-project.use-case';
import { EquipmentModule } from '../equipment/equipment.module';
import { ProjectEquipmentOrmEntity } from './infrastructure/persistence/project-equipment.orm-entity';
import { TypeOrmProjectEquipmentRepository } from './infrastructure/persistence/typeorm-project-equipment.repository';
import { PROJECT_EQUIPMENT_REPOSITORY } from './domain/project-equipment.repository';
import { ProjectEquipmentUseCase } from './application/project-equipment/project-equipment.use-case';
import { ProjectEquipmentController } from './infrastructure/http/project-equipment.controller';
import { PROJECT_FINANCIALS_PROVIDER } from './domain/project-financials-provider.port';
import { TypeOrmProjectFinancialsProvider } from './infrastructure/persistence/typeorm-project-financials-provider';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectOrmEntity, ProjectEquipmentOrmEntity]), EquipmentModule],
  controllers: [ProjectsController, ProjectEquipmentController],
  providers: [
    ListProjectsUseCase,
    GetProjectUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    ProjectEquipmentUseCase,
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: PROJECT_EQUIPMENT_REPOSITORY, useClass: TypeOrmProjectEquipmentRepository },
    { provide: PROJECT_FINANCIALS_PROVIDER, useClass: TypeOrmProjectFinancialsProvider },
  ],
})
export class ProjectsModule {}
