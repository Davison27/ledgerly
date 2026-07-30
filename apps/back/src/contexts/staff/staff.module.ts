import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffMemberOrmEntity } from './infrastructure/persistence/staff-member.orm-entity';
import { StaffDocumentOrmEntity } from './infrastructure/persistence/staff-document.orm-entity';
import { StaffDocumentTypeOrmEntity } from './infrastructure/persistence/staff-document-type.orm-entity';
import { TypeOrmStaffMemberRepository } from './infrastructure/persistence/typeorm-staff-member.repository';
import { TypeOrmStaffDocumentRepository } from './infrastructure/persistence/typeorm-staff-document.repository';
import { TypeOrmStaffDocumentTypeRepository } from './infrastructure/persistence/typeorm-staff-document-type.repository';
import { TypeOrmStaffPayrollCounter } from './infrastructure/persistence/typeorm-staff-payroll-counter';
import { StaffDocumentTypeCatalogInitializer } from './infrastructure/persistence/staff-document-type-catalog.initializer';
import { StaffController } from './infrastructure/http/staff.controller';
import { StaffDocumentsController } from './infrastructure/http/staff-documents.controller';
import { StaffDocumentTypesController } from './infrastructure/http/staff-document-types.controller';
import { STAFF_MEMBER_REPOSITORY } from './domain/staff-member.repository';
import { STAFF_DOCUMENT_REPOSITORY } from './domain/staff-document.repository';
import { STAFF_DOCUMENT_TYPE_REPOSITORY } from './domain/staff-document-type.repository';
import { STAFF_PAYROLL_COUNTER } from './domain/staff-payroll-counter.port';
import { ListStaffMembersUseCase } from './application/list-staff-members/list-staff-members.use-case';
import { GetStaffMemberUseCase } from './application/get-staff-member/get-staff-member.use-case';
import { CreateStaffMemberUseCase } from './application/create-staff-member/create-staff-member.use-case';
import { UpdateStaffMemberUseCase } from './application/update-staff-member/update-staff-member.use-case';
import { DeleteStaffMemberUseCase } from './application/delete-staff-member/delete-staff-member.use-case';
import { ListStaffDocumentTypesUseCase } from './application/list-staff-document-types/list-staff-document-types.use-case';
import { ListStaffDocumentsUseCase } from './application/list-staff-documents/list-staff-documents.use-case';
import { CreateStaffDocumentUseCase } from './application/create-staff-document/create-staff-document.use-case';
import { UpdateStaffDocumentUseCase } from './application/update-staff-document/update-staff-document.use-case';
import { DeleteStaffDocumentUseCase } from './application/delete-staff-document/delete-staff-document.use-case';
import { GetStaffDocumentFileUseCase } from './application/get-staff-document-file/get-staff-document-file.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffMemberOrmEntity, StaffDocumentOrmEntity, StaffDocumentTypeOrmEntity]),
  ],
  controllers: [StaffController, StaffDocumentsController, StaffDocumentTypesController],
  providers: [
    ListStaffMembersUseCase,
    GetStaffMemberUseCase,
    CreateStaffMemberUseCase,
    UpdateStaffMemberUseCase,
    DeleteStaffMemberUseCase,
    ListStaffDocumentTypesUseCase,
    ListStaffDocumentsUseCase,
    CreateStaffDocumentUseCase,
    UpdateStaffDocumentUseCase,
    DeleteStaffDocumentUseCase,
    GetStaffDocumentFileUseCase,
    StaffDocumentTypeCatalogInitializer,
    { provide: STAFF_MEMBER_REPOSITORY, useClass: TypeOrmStaffMemberRepository },
    { provide: STAFF_DOCUMENT_REPOSITORY, useClass: TypeOrmStaffDocumentRepository },
    { provide: STAFF_DOCUMENT_TYPE_REPOSITORY, useClass: TypeOrmStaffDocumentTypeRepository },
    { provide: STAFF_PAYROLL_COUNTER, useClass: TypeOrmStaffPayrollCounter },
  ],
})
export class StaffModule {}
