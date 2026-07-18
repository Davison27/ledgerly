import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from './infrastructure/persistence/document.orm-entity';
import { TypeOrmDocumentRepository } from './infrastructure/persistence/typeorm-document.repository';
import { TypeOrmProjectExistenceChecker } from './infrastructure/persistence/typeorm-project-existence-checker';
import { TypeOrmSupplierExistenceChecker } from './infrastructure/persistence/typeorm-supplier-existence-checker';
import { InvoiceExtractionHintOrmEntity } from './infrastructure/persistence/invoice-extraction-hint.orm-entity';
import { TypeOrmInvoiceHintRepository } from './infrastructure/persistence/typeorm-invoice-hint.repository';
import { ExtractionOutcomeOrmEntity } from './infrastructure/persistence/extraction-outcome.orm-entity';
import { TypeOrmExtractionOutcomeRepository } from './infrastructure/persistence/typeorm-extraction-outcome.repository';
import { DOCUMENT_REPOSITORY } from './domain/document.repository';
import { PROJECT_EXISTENCE_CHECKER } from './domain/project-existence-checker.port';
import { SUPPLIER_EXISTENCE_CHECKER } from './domain/supplier-existence-checker.port';
import { PDF_READER } from './domain/extraction/pdf-reader.port';
import { INVOICE_HINT_REPOSITORY } from './domain/extraction/hints/invoice-hint.repository';
import { EXTRACTION_OUTCOME_REPOSITORY } from './domain/extraction/quality/extraction-outcome.repository';
import { DocumentsController } from './infrastructure/http/documents.controller';
import { DocumentsGlobalController } from './infrastructure/http/documents-global.controller';
import { ExtractionHintsController } from './infrastructure/http/extraction-hints.controller';
import { ExtractionQualityController } from './infrastructure/http/extraction-quality.controller';
import { PdfjsPdfReader } from './infrastructure/pdf/pdfjs-pdf-reader';
import { ListDocumentsUseCase } from './application/list-documents/list-documents.use-case';
import { ListAllDocumentsUseCase } from './application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from './application/check-document-duplicate/check-document-duplicate.use-case';
import { GetDocumentUseCase } from './application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from './application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from './application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from './application/extract-invoice/extract-invoice.use-case';
import { GetDocumentFileUseCase } from './application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from './application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionOutcomeUseCase } from './application/record-extraction-outcome/record-extraction-outcome.use-case';
import { GetExtractionQualityUseCase } from './application/get-extraction-quality/get-extraction-quality.use-case';
import { ListHintsUseCase } from './application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from './application/delete-hint/delete-hint.use-case';
import { ProjectOrmEntity } from '../projects/infrastructure/persistence/project.orm-entity';
import { TypeOrmProjectRepository } from '../projects/infrastructure/persistence/typeorm-project.repository';
import { PROJECT_REPOSITORY } from '../projects/domain/project.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentOrmEntity,
      InvoiceExtractionHintOrmEntity,
      ExtractionOutcomeOrmEntity,
      ProjectOrmEntity,
    ]),
  ],
  controllers: [DocumentsController, DocumentsGlobalController, ExtractionHintsController, ExtractionQualityController],
  providers: [
    ListDocumentsUseCase,
    ListAllDocumentsUseCase,
    CheckDocumentDuplicateUseCase,
    GetDocumentUseCase,
    CreateDocumentUseCase,
    DeleteDocumentUseCase,
    ExtractInvoiceUseCase,
    GetDocumentFileUseCase,
    RecordExtractionFeedbackUseCase,
    RecordExtractionOutcomeUseCase,
    GetExtractionQualityUseCase,
    ListHintsUseCase,
    DeleteHintUseCase,
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
    { provide: PROJECT_EXISTENCE_CHECKER, useClass: TypeOrmProjectExistenceChecker },
    { provide: SUPPLIER_EXISTENCE_CHECKER, useClass: TypeOrmSupplierExistenceChecker },
    { provide: PDF_READER, useClass: PdfjsPdfReader },
    { provide: INVOICE_HINT_REPOSITORY, useClass: TypeOrmInvoiceHintRepository },
    { provide: EXTRACTION_OUTCOME_REPOSITORY, useClass: TypeOrmExtractionOutcomeRepository },
  ],
})
export class DocumentsModule {}
