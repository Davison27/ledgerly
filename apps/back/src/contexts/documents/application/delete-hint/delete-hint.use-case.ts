import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

@Injectable()
export class DeleteHintUseCase {
  constructor(@Inject(INVOICE_HINT_REPOSITORY) private readonly repository: InvoiceHintRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new EntityNotFoundException('Extraction hint', id);
    }
  }
}
