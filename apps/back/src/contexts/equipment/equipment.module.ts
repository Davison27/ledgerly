import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateEquipmentDocumentUseCase } from './application/create-equipment-document/create-equipment-document.use-case';
import { EquipmentOrmEntity } from './infrastructure/persistence/equipment.orm-entity';
import { EquipmentDocumentOrmEntity } from './infrastructure/persistence/equipment-document.orm-entity';
import { TypeOrmEquipmentRepository } from './infrastructure/persistence/typeorm-equipment.repository';
import { TypeOrmEquipmentDocumentRepository } from './infrastructure/persistence/typeorm-equipment-document.repository';
import { EquipmentController } from './infrastructure/http/equipment.controller';
import { EquipmentDocumentsController } from './infrastructure/http/equipment-documents.controller';
import { EQUIPMENT_REPOSITORY } from './domain/equipment.repository';
import { EQUIPMENT_DOCUMENT_REPOSITORY } from './domain/equipment-document.repository';
import { ListEquipmentUseCase } from './application/list-equipment/list-equipment.use-case';
import { CreateEquipmentUseCase } from './application/create-equipment/create-equipment.use-case';
import { UpdateEquipmentUseCase } from './application/update-equipment/update-equipment.use-case';
import { DeleteEquipmentUseCase } from './application/delete-equipment/delete-equipment.use-case';
import { DeleteEquipmentDocumentUseCase } from './application/delete-equipment-document/delete-equipment-document.use-case';
import { GetEquipmentDocumentFileUseCase } from './application/get-equipment-document-file/get-equipment-document-file.use-case';
import { ListEquipmentDocumentsUseCase } from './application/list-equipment-documents/list-equipment-documents.use-case';
import { UpdateEquipmentDocumentUseCase } from './application/update-equipment-document/update-equipment-document.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentOrmEntity, EquipmentDocumentOrmEntity])],
  controllers: [EquipmentController, EquipmentDocumentsController],
  providers: [
    ListEquipmentUseCase,
    CreateEquipmentUseCase,
    UpdateEquipmentUseCase,
    DeleteEquipmentUseCase,
    ListEquipmentDocumentsUseCase,
    CreateEquipmentDocumentUseCase,
    UpdateEquipmentDocumentUseCase,
    DeleteEquipmentDocumentUseCase,
    GetEquipmentDocumentFileUseCase,
    { provide: EQUIPMENT_REPOSITORY, useClass: TypeOrmEquipmentRepository },
    { provide: EQUIPMENT_DOCUMENT_REPOSITORY, useClass: TypeOrmEquipmentDocumentRepository },
  ],
  exports: [EQUIPMENT_REPOSITORY],
})
export class EquipmentModule {}
