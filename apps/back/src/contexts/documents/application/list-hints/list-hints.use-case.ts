import { Inject, Injectable } from '@nestjs/common';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { Page, PageRequest } from '../../../../shared/domain/pagination';

@Injectable()
export class ListHintsUseCase {
  constructor(@Inject(INVOICE_HINT_REPOSITORY) private readonly repository: InvoiceHintRepository) {}

  execute(): Promise<InvoiceHint[]> {
    return this.repository.findAll();
  }

  async executePage(request: PageRequest): Promise<Page<InvoiceHint>> {
    if (this.repository.findPage) {
      return this.repository.findPage(request);
    }

    const hints = await this.repository.findAll();
    const start = (request.page - 1) * request.size;

    return {
      items: hints.slice(start, start + request.size),
      total: hints.length,
      page: request.page,
      size: request.size,
    };
  }
}
