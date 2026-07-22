import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceOrmEntity } from './infrastructure/persistence/invoice.orm-entity';
import { InvoiceLineOrmEntity } from './infrastructure/persistence/invoice-line.orm-entity';
import { TypeOrmInvoiceRepository } from './infrastructure/persistence/typeorm-invoice.repository';
import { TypeOrmProjectExistenceChecker } from './infrastructure/persistence/typeorm-project-existence-checker';
import { PdfkitInvoicePdfRenderer } from './infrastructure/pdf/pdfkit-invoice-pdf-renderer';
import { CompanyRepositoryInvoiceIssuer } from './infrastructure/company/company-repository-invoice-issuer';
import { DocumentLedgerEntryPublisher } from './infrastructure/documents/document-ledger-entry.publisher';
import { InvoicesController } from './infrastructure/http/invoices.controller';
import { INVOICE_REPOSITORY } from './domain/invoice.repository';
import { INVOICE_PDF_RENDERER } from './domain/invoice-pdf-renderer.port';
import { INVOICE_ISSUER_PROVIDER } from './domain/invoice-issuer.port';
import { PROJECT_EXISTENCE_CHECKER } from './domain/project-existence-checker.port';
import { LEDGER_ENTRY_PUBLISHER } from './domain/ledger-entry.port';
import { ListInvoicesUseCase } from './application/list-invoices/list-invoices.use-case';
import { GetInvoiceUseCase } from './application/get-invoice/get-invoice.use-case';
import { CreateInvoiceUseCase } from './application/create-invoice/create-invoice.use-case';
import { GetInvoicePdfUseCase } from './application/get-invoice-pdf/get-invoice-pdf.use-case';
import { DeleteInvoiceUseCase } from './application/delete-invoice/delete-invoice.use-case';
import { DocumentsModule } from '../documents/documents.module';
import { COMPANY_REPOSITORY } from '../company/domain/company.repository';
import { TypeOrmCompanyRepository } from '../company/infrastructure/persistence/typeorm-company.repository';
import { CompanyOrmEntity } from '../company/infrastructure/persistence/company.orm-entity';
import { ProjectOrmEntity } from '../projects/infrastructure/persistence/project.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceOrmEntity, InvoiceLineOrmEntity, CompanyOrmEntity, ProjectOrmEntity]),
    DocumentsModule,
  ],
  controllers: [InvoicesController],
  providers: [
    ListInvoicesUseCase,
    GetInvoiceUseCase,
    CreateInvoiceUseCase,
    GetInvoicePdfUseCase,
    DeleteInvoiceUseCase,
    { provide: INVOICE_REPOSITORY, useClass: TypeOrmInvoiceRepository },
    { provide: INVOICE_PDF_RENDERER, useClass: PdfkitInvoicePdfRenderer },
    { provide: INVOICE_ISSUER_PROVIDER, useClass: CompanyRepositoryInvoiceIssuer },
    { provide: PROJECT_EXISTENCE_CHECKER, useClass: TypeOrmProjectExistenceChecker },
    { provide: LEDGER_ENTRY_PUBLISHER, useClass: DocumentLedgerEntryPublisher },
    { provide: COMPANY_REPOSITORY, useClass: TypeOrmCompanyRepository },
  ],
})
export class InvoicesModule {}
