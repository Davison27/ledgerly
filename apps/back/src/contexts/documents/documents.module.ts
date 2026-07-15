import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from './infrastructure/persistence/document.orm-entity';
import { TypeOrmDocumentRepository } from './infrastructure/persistence/typeorm-document.repository';
import { TypeOrmProjectExistenceChecker } from './infrastructure/persistence/typeorm-project-existence-checker';
import { DOCUMENT_REPOSITORY } from './domain/document.repository';
import { PROJECT_EXISTENCE_CHECKER } from './domain/project-existence-checker.port';
import { PDF_READER } from './domain/extraction/pdf-reader.port';
import { DocumentsController } from './infrastructure/http/documents.controller';
import { PdfjsPdfReader } from './infrastructure/pdf/pdfjs-pdf-reader';
import { ListDocumentsUseCase } from './application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from './application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from './application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from './application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from './application/extract-invoice/extract-invoice.use-case';
import { GetDocumentFileUseCase } from './application/get-document-file/get-document-file.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentOrmEntity])],
  controllers: [DocumentsController],
  providers: [
    ListDocumentsUseCase,
    GetDocumentUseCase,
    CreateDocumentUseCase,
    DeleteDocumentUseCase,
    ExtractInvoiceUseCase,
    GetDocumentFileUseCase,
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: PROJECT_EXISTENCE_CHECKER, useClass: TypeOrmProjectExistenceChecker },
    { provide: PDF_READER, useClass: PdfjsPdfReader },
  ],
})
export class DocumentsModule {}
