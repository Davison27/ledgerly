import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { DeleteHintUseCase } from './delete-hint.use-case';

class InMemoryInvoiceHintRepository implements InvoiceHintRepository {
  private hints: InvoiceHint[];
  readonly deletedIds: string[] = [];
  readonly deleteCalls: string[] = [];
  findAllCalls = 0;

  constructor(hints: InvoiceHint[] = []) {
    this.hints = hints;
  }

  findByIssuer(issuerName: string): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints.filter((hint) => hint.issuerName === issuerName));
  }

  findAll(): Promise<InvoiceHint[]> {
    this.findAllCalls += 1;
    return Promise.resolve([...this.hints]);
  }

  upsert(): Promise<void> {
    return Promise.resolve();
  }

  delete(id: string): Promise<boolean> {
    this.deleteCalls.push(id);
    const previousSize = this.hints.length;
    this.hints = this.hints.filter((hint) => hint.id !== id);
    const deleted = this.hints.length < previousSize;

    if (deleted) this.deletedIds.push(id);

    return Promise.resolve(deleted);
  }

  snapshot(): InvoiceHint[] {
    return [...this.hints];
  }
}

const HINT: InvoiceHint = {
  id: 'hint-1',
  issuerName: 'ACME SL',
  field: 'invoiceNumber',
  anchorKind: 'inline',
  anchorLabel: 'Invoice',
  lineOffset: 0,
  sampleValue: 'INV-1',
  occurrences: 1,
};

describe('DeleteHintUseCase', () => {
  it('rejects an unknown hint when atomic deletion reports no row', async () => {
    const repository = new InMemoryInvoiceHintRepository([HINT]);
    const useCase = new DeleteHintUseCase(repository);

    await expect(useCase.execute('product-1')).rejects.toThrow(EntityNotFoundException);

    expect(repository.findAllCalls).toBe(0);
    expect(repository.deleteCalls).toEqual(['product-1']);
    expect(repository.deletedIds).toEqual([]);
    expect(repository.snapshot()).toEqual([HINT]);
  });

  it('deletes an existing hint', async () => {
    const repository = new InMemoryInvoiceHintRepository([HINT]);
    const useCase = new DeleteHintUseCase(repository);

    await useCase.execute('hint-1');

    expect(repository.deletedIds).toEqual(['hint-1']);
    expect(repository.snapshot()).toEqual([]);
  });
});
