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
import { PROJECT_CLIENT_LIFECYCLE_COORDINATOR } from './domain/project-client-lifecycle-coordinator.port';
import { TypeOrmProjectClientLifecycleCoordinator } from './infrastructure/persistence/typeorm-project-client-lifecycle-coordinator';
import { ClientsController } from './infrastructure/http/clients.controller';
import { ListClientsUseCase } from './application/list-clients/list-clients.use-case';
import { GetClientUseCase } from './application/get-client/get-client.use-case';
import { CreateClientUseCase } from './application/create-client/create-client.use-case';
import { UpdateClientUseCase } from './application/update-client/update-client.use-case';
import { DeleteClientUseCase } from './application/delete-client/delete-client.use-case';
import { UnarchiveClientUseCase } from './application/unarchive-client/unarchive-client.use-case';
import { ProjectChecklistTemplateOrmEntity } from './infrastructure/persistence/project-checklist-template.orm-entity';
import { ProjectChecklistTemplateItemOrmEntity } from './infrastructure/persistence/project-checklist-template-item.orm-entity';
import { ProjectChecklistOrmEntity } from './infrastructure/persistence/project-checklist.orm-entity';
import { ProjectChecklistItemOrmEntity } from './infrastructure/persistence/project-checklist-item.orm-entity';
import { ProjectChecklistTemplatesController } from './infrastructure/http/project-checklist-templates.controller';
import { ProjectChecklistController } from './infrastructure/http/project-checklist.controller';
import { PROJECT_CHECKLIST_TEMPLATE_REPOSITORY } from './domain/project-checklist-template.repository';
import { TypeOrmProjectChecklistTemplateRepository } from './infrastructure/persistence/typeorm-project-checklist-template.repository';
import { PROJECT_CHECKLIST_REPOSITORY } from './domain/project-checklist.repository';
import { TypeOrmProjectChecklistRepository } from './infrastructure/persistence/typeorm-project-checklist.repository';
import { ListChecklistTemplatesUseCase } from './application/list-checklist-templates/list-checklist-templates.use-case';
import { GetChecklistTemplateUseCase } from './application/get-checklist-template/get-checklist-template.use-case';
import { CreateChecklistTemplateUseCase } from './application/create-checklist-template/create-checklist-template.use-case';
import { UpdateChecklistTemplateUseCase } from './application/update-checklist-template/update-checklist-template.use-case';
import { DeleteChecklistTemplateUseCase } from './application/delete-checklist-template/delete-checklist-template.use-case';
import { GetProjectChecklistUseCase } from './application/get-project-checklist/get-project-checklist.use-case';
import { AddProjectChecklistItemUseCase } from './application/add-project-checklist-item/add-project-checklist-item.use-case';
import { UpdateProjectChecklistItemUseCase } from './application/update-project-checklist-item/update-project-checklist-item.use-case';
import { DeleteProjectChecklistItemUseCase } from './application/delete-project-checklist-item/delete-project-checklist-item.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([
    ProjectOrmEntity,
    ProjectEquipmentOrmEntity,
    ProjectEquipmentLeaseExpenseOrmEntity,
    ClientOrmEntity,
    ProjectChecklistTemplateOrmEntity,
    ProjectChecklistTemplateItemOrmEntity,
    ProjectChecklistOrmEntity,
    ProjectChecklistItemOrmEntity,
  ]), EquipmentModule],
  controllers: [
    ProjectsController,
    ProjectEquipmentController,
    ClientsController,
    ProjectChecklistTemplatesController,
    ProjectChecklistController,
  ],
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
    ListChecklistTemplatesUseCase,
    GetChecklistTemplateUseCase,
    CreateChecklistTemplateUseCase,
    UpdateChecklistTemplateUseCase,
    DeleteChecklistTemplateUseCase,
    GetProjectChecklistUseCase,
    AddProjectChecklistItemUseCase,
    UpdateProjectChecklistItemUseCase,
    DeleteProjectChecklistItemUseCase,
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: PROJECT_CHECKLIST_TEMPLATE_REPOSITORY, useClass: TypeOrmProjectChecklistTemplateRepository },
    { provide: PROJECT_CHECKLIST_REPOSITORY, useClass: TypeOrmProjectChecklistRepository },
    { provide: PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER, useClass: TypeOrmProjectPhysicalDocumentReferenceCounter },
    { provide: PROJECT_EQUIPMENT_REPOSITORY, useClass: TypeOrmProjectEquipmentRepository },
    { provide: PROJECT_FINANCIALS_PROVIDER, useClass: TypeOrmProjectFinancialsProvider },
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: PROJECT_CLIENT_LIFECYCLE_COORDINATOR, useClass: TypeOrmProjectClientLifecycleCoordinator },
  ],
})
export class ProjectsModule {}
