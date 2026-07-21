import { Inject, Injectable, Logger } from '@nestjs/common';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';
import { DeleteDocumentUseCase } from '../../../documents/application/delete-document/delete-document.use-case';

@Injectable()
export class DeleteInvoiceUseCase {
  private readonly logger = new Logger(DeleteInvoiceUseCase.name);

  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
  ) {}

  // D9: deleting the invoice also deletes its mirror document when one
  // exists — the mirror only exists because of the invoice, so leaving it
  // behind would keep an unsupported income in the dashboard. A failure
  // deleting the mirror is logged and does not prevent the invoice itself
  // from being deleted.
  async execute(id: string): Promise<void> {
    const invoice = await this.invoiceRepository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundException(id);
    }

    await this.invoiceRepository.delete(id);

    const documentId = invoice.getDocumentId();

    if (documentId !== null) {
      try {
        await this.deleteDocumentUseCase.execute(documentId);
      } catch (error) {
        this.logger.warn(
          `Failed to delete mirror document ${documentId} for invoice ${id}: ${String(error)}`,
        );
      }
    }
  }
}
