import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';

export interface InvoicePdfResult {
  content: Buffer;
  fileName: string;
}

@Injectable()
export class GetInvoicePdfUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository) {}

  async execute(id: string): Promise<InvoicePdfResult> {
    const invoice = await this.invoiceRepository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundException(id);
    }

    const pdf = await this.invoiceRepository.findPdf(id);

    if (!pdf) {
      throw new InvoiceNotFoundException(id);
    }

    return {
      content: pdf,
      fileName: `factura-${invoice.getFullNumber()}.pdf`,
    };
  }
}
