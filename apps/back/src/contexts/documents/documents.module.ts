import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from './infrastructure/persistence/document.orm-entity';
import { TypeOrmDocumentRepository } from './infrastructure/persistence/typeorm-document.repository';
import { TypeOrmProjectExistenceChecker } from './infrastructure/persistence/typeorm-project-existence-checker';
import { TypeOrmSupplierExistenceChecker } from './infrastructure/persistence/typeorm-supplier-existence-checker';
import { InvoiceExtractionHintOrmEntity } from './infrastructure/persistence/invoice-extraction-hint.orm-entity';
import { TypeOrmInvoiceHintRepository } from './infrastructure/persistence/typeorm-invoice-hint.repository';
import { DOCUMENT_REPOSITORY } from './domain/document.repository';
import { PROJECT_EXISTENCE_CHECKER } from './domain/project-existence-checker.port';
import { SUPPLIER_EXISTENCE_CHECKER } from './domain/supplier-existence-checker.port';
import { PDF_READER } from './domain/extraction/pdf-reader.port';
import { INVOICE_HINT_REPOSITORY } from './domain/extraction/hints/invoice-hint.repository';
import { DocumentsController } from './infrastructure/http/documents.controller';
import { ExtractionHintsController } from './infrastructure/http/extraction-hints.controller';
import { PdfjsPdfReader } from './infrastructure/pdf/pdfjs-pdf-reader';
import { ListDocumentsUseCase } from './application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from './application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from './application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from './application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from './application/extract-invoice/extract-invoice.use-case';
import { GetDocumentFileUseCase } from './application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from './application/record-extraction-feedback/record-extraction-feedback.use-case';
import { ListHintsUseCase } from './application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from './application/delete-hint/delete-hint.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentOrmEntity, InvoiceExtractionHintOrmEntity])],
  controllers: [DocumentsController, ExtractionHintsController],
  providers: [
    ListDocumentsUseCase,
    GetDocumentUseCase,
    CreateDocumentUseCase,
    DeleteDocumentUseCase,
    ExtractInvoiceUseCase,
    GetDocumentFileUseCase,
    RecordExtractionFeedbackUseCase,
    ListHintsUseCase,
    DeleteHintUseCase,
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: PROJECT_EXISTENCE_CHECKER, useClass: TypeOrmProjectExistenceChecker },
    { provide: SUPPLIER_EXISTENCE_CHECKER, useClass: TypeOrmSupplierExistenceChecker },
    { provide: PDF_READER, useClass: PdfjsPdfReader },
    { provide: INVOICE_HINT_REPOSITORY, useClass: TypeOrmInvoiceHintRepository },
  ],
})
export class DocumentsModule {}
