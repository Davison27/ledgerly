import { Inject, Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../../domain/invoice';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import {
  PROJECT_EXISTENCE_CHECKER,
  ProjectExistenceChecker,
} from '../../domain/project-existence-checker.port';
import {
  INVOICE_ISSUER_PROVIDER,
  InvoiceIssuerProvider,
} from '../../domain/invoice-issuer.port';
import {
  INVOICE_PDF_RENDERER,
  InvoicePdfRenderer,
} from '../../domain/invoice-pdf-renderer.port';
import { LEDGER_ENTRY_PUBLISHER, LedgerEntryPublisher } from '../../domain/ledger-entry.port';
import { InvoiceProjectNotFoundException } from '../../domain/errors/invoice-project-not-found.exception';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateInvoiceCommand } from './create-invoice.command';
import { buildInvoicePdfView } from './build-invoice-pdf-view';

const INVOICE_SERIES = 'F';

@Injectable()
export class CreateInvoiceUseCase {
  private readonly logger = new Logger(CreateInvoiceUseCase.name);

  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository,
    @Inject(PROJECT_EXISTENCE_CHECKER)
    private readonly projectExistenceChecker: ProjectExistenceChecker,
    @Inject(INVOICE_ISSUER_PROVIDER) private readonly issuerProvider: InvoiceIssuerProvider,
    @Inject(INVOICE_PDF_RENDERER) private readonly pdfRenderer: InvoicePdfRenderer,
    @Inject(LEDGER_ENTRY_PUBLISHER) private readonly ledgerEntryPublisher: LedgerEntryPublisher,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<Invoice> {
    const projectExists = await this.projectExistenceChecker.exists(command.projectId);

    if (!projectExists) {
      throw new InvoiceProjectNotFoundException(command.projectId);
    }

    const issuer = await this.issuerProvider.get();

    const year = Number(command.issueDate.slice(0, 4));

    const invoice = Invoice.create({
      id: this.idGenerator.generate(),
      series: INVOICE_SERIES,
      year,
      number: 0,
      issueDate: command.issueDate,
      projectId: command.projectId,
      customerName: command.customerName,
      customerTaxId: command.customerTaxId,
      customerAddress: command.customerAddress,
      lines: command.lines,
      taxRate: command.taxRate,
      irpfRate: command.irpfRate,
      notes: command.notes,
    });

    const numberedInvoice = await this.invoiceRepository.saveWithNumber(invoice, {
      series: INVOICE_SERIES,
      year,
    });

    const view = buildInvoicePdfView(numberedInvoice, issuer);
    const pdf = await this.pdfRenderer.render(view);
    await this.invoiceRepository.savePdf(numberedInvoice.getId(), pdf);

    const documentId = await this.ledgerEntryPublisher.publish(numberedInvoice, issuer, pdf);

    try {
      await this.invoiceRepository.linkDocument(numberedInvoice.getId(), documentId);
    } catch (error) {
      this.logger.warn(
        `Failed to link mirror document ${documentId} to invoice ${numberedInvoice.getId()}: ${String(error)}`,
      );
    }

    return numberedInvoice.withDocumentId(documentId).withPdfSize(pdf.length);
  }
}
