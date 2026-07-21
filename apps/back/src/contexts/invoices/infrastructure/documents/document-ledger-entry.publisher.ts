import { Injectable } from '@nestjs/common';
import { CreateDocumentUseCase } from '../../../documents/application/create-document/create-document.use-case';
import { DocumentCurrency } from '../../../documents/domain/document-currency';
import { Invoice } from '../../domain/invoice';
import { InvoiceIssuer } from '../../domain/invoice-issuer.port';
import { LedgerEntryPublisher } from '../../domain/ledger-entry.port';

@Injectable()
export class DocumentLedgerEntryPublisher implements LedgerEntryPublisher {
  constructor(private readonly createDocumentUseCase: CreateDocumentUseCase) {}

  /**
   * D9: injects `CreateDocumentUseCase` directly, never the HTTP endpoint —
   * `POST /api/projects/:id/documents` would also run
   * `recordExtractionFeedback`/`recordExtractionOutcome`
   * (`documents.controller.ts:132-135`) against a PDF we generated
   * ourselves, feeding the extractor with its own output. Calling the
   * controller/endpoint from here is a defect.
   */
  async publish(invoice: Invoice, issuer: InvoiceIssuer, pdf: Buffer): Promise<string> {
    const month = Number(invoice.getIssueDate().slice(5, 7));

    const document = await this.createDocumentUseCase.execute({
      projectId: invoice.getProjectId(),
      name: `Factura ${invoice.getFullNumber()}`,
      type: 'factura',
      direction: 'ingreso',
      status: 'pendiente',
      date: invoice.getIssueDate(),
      month,
      amount: invoice.getTotal(),
      issuerName: issuer.name,
      issuerTaxId: issuer.taxId,
      invoiceNumber: invoice.getFullNumber(),
      taxBase: invoice.getTaxBase(),
      taxRate: invoice.getTaxRate(),
      taxAmount: invoice.getTaxAmount(),
      irpfRate: invoice.getIrpfRate(),
      irpfAmount: invoice.getIrpfAmount(),
      currency: invoice.getCurrency() as DocumentCurrency,
      file: {
        buffer: pdf,
        originalName: `factura-${invoice.getFullNumber()}.pdf`,
        mimeType: 'application/pdf',
        size: pdf.length,
      },
    });

    return document.getId();
  }
}
