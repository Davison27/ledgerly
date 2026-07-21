import { Inject, Injectable } from '@nestjs/common';
import { Invoice } from '../../domain/invoice';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';

@Injectable()
export class GetInvoiceUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundException(id);
    }

    return invoice;
  }
}
