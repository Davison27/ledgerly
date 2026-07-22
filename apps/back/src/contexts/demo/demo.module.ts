import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectOrmEntity } from '../projects/infrastructure/persistence/project.orm-entity';
import { TypeOrmProjectRepository } from '../projects/infrastructure/persistence/typeorm-project.repository';
import { PROJECT_REPOSITORY } from '../projects/domain/project.repository';
import { DocumentOrmEntity } from '../documents/infrastructure/persistence/document.orm-entity';
import { TypeOrmDocumentRepository } from '../documents/infrastructure/persistence/typeorm-document.repository';
import { DOCUMENT_REPOSITORY } from '../documents/domain/document.repository';
import { StaffMemberOrmEntity } from '../staff/infrastructure/persistence/staff-member.orm-entity';
import { TypeOrmStaffMemberRepository } from '../staff/infrastructure/persistence/typeorm-staff-member.repository';
import { STAFF_MEMBER_REPOSITORY } from '../staff/domain/staff-member.repository';
import { LoadDemoDataUseCase } from './application/load-demo-data/load-demo-data.use-case';
import { DemoController } from './infrastructure/http/demo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectOrmEntity, DocumentOrmEntity, StaffMemberOrmEntity])],
  controllers: [DemoController],
  providers: [
    LoadDemoDataUseCase,
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: STAFF_MEMBER_REPOSITORY, useClass: TypeOrmStaffMemberRepository },
  ],
})
export class DemoModule {}
