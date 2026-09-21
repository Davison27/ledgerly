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
import { ProjectEquipmentLeaseExpenseOrmEntity } from './infrastructure/persistence/project-equipment-lease-expense.orm-entity';
import { TypeOrmProjectEquipmentRepository } from './infrastructure/persistence/typeorm-project-equipment.repository';
import { PROJECT_EQUIPMENT_REPOSITORY } from './domain/project-equipment.repository';
import { ProjectEquipmentUseCase } from './application/project-equipment/project-equipment.use-case';
import { ProjectEquipmentController } from './infrastructure/http/project-equipment.controller';
import { PROJECT_FINANCIALS_PROVIDER } from './domain/project-financials-provider.port';
import { TypeOrmProjectFinancialsProvider } from './infrastructure/persistence/typeorm-project-financials-provider';
import { PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER } from './domain/physical-document-reference-counter.port';
import { TypeOrmProjectPhysicalDocumentReferenceCounter } from './infrastructure/persistence/typeorm-project-physical-document-reference-counter';
import { UnarchiveProjectUseCase } from './application/unarchive-project/unarchive-project.use-case';
import { ClientOrmEntity } from './infrastructure/persistence/client.orm-entity';
import { TypeOrmClientRepository } from './infrastructure/persistence/typeorm-client.repository';
import { CLIENT_REPOSITORY } from './domain/client.repository';
import { CLIENT_REFERENCE_COUNTER } from './domain/client-reference-counter.port';
import { TypeOrmClientReferenceCounter } from './infrastructure/persistence/typeorm-client-reference-counter';
import { ClientsController } from './infrastructure/http/clients.controller';
import { ListClientsUseCase } from './application/list-clients/list-clients.use-case';
import { GetClientUseCase } from './application/get-client/get-client.use-case';
import { CreateClientUseCase } from './application/create-client/create-client.use-case';
import { UpdateClientUseCase } from './application/update-client/update-client.use-case';
import { DeleteClientUseCase } from './application/delete-client/delete-client.use-case';
import { UnarchiveClientUseCase } from './application/unarchive-client/unarchive-client.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectOrmEntity, ProjectEquipmentOrmEntity, ProjectEquipmentLeaseExpenseOrmEntity, ClientOrmEntity]), EquipmentModule],
  controllers: [ProjectsController, ProjectEquipmentController, ClientsController],
  providers: [
    ListProjectsUseCase,
    GetProjectUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    UnarchiveProjectUseCase,
    ListClientsUseCase,
    GetClientUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    UnarchiveClientUseCase,
    ProjectEquipmentUseCase,
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER, useClass: TypeOrmProjectPhysicalDocumentReferenceCounter },
    { provide: PROJECT_EQUIPMENT_REPOSITORY, useClass: TypeOrmProjectEquipmentRepository },
    { provide: PROJECT_FINANCIALS_PROVIDER, useClass: TypeOrmProjectFinancialsProvider },
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: CLIENT_REFERENCE_COUNTER, useClass: TypeOrmClientReferenceCounter },
  ],
})
export class ProjectsModule {}
