import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';

@Injectable()
export class DeleteHintUseCase {
  constructor(@Inject(INVOICE_HINT_REPOSITORY) private readonly repository: InvoiceHintRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
