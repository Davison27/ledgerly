import { Inject, Injectable } from '@nestjs/common';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';

@Injectable()
export class ListHintsUseCase {
  constructor(@Inject(INVOICE_HINT_REPOSITORY) private readonly repository: InvoiceHintRepository) {}

  execute(): Promise<InvoiceHint[]> {
    return this.repository.findAll();
  }
}
