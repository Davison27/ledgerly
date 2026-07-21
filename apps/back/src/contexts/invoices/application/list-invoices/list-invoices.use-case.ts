import { Inject, Injectable } from '@nestjs/common';
import { Invoice } from '../../domain/invoice';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';

@Injectable()
export class ListInvoicesUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository) {}

  execute(): Promise<Invoice[]> {
    return this.invoiceRepository.findAll();
  }
}
