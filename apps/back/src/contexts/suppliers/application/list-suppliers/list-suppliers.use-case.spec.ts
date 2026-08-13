import { ListSuppliersUseCase } from './list-suppliers.use-case';
import { Supplier } from '../../domain/supplier';
import { SupplierSpendProvider, SupplierSpendRow } from '../../domain/supplier-spend-provider.port';
import { SupplierRepository } from '../../domain/supplier.repository';

class InMemorySupplierRepository implements SupplierRepository {
  constructor(private readonly suppliers: Supplier[]) {}

  findAll(): Promise<Supplier[]> {
    return Promise.resolve(this.suppliers);
  }

  findById(): Promise<Supplier | null> {
    return Promise.resolve(null);
  }

  findByTaxId(): Promise<Supplier | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemorySupplierSpendProvider implements SupplierSpendProvider {
  constructor(private readonly rows: SupplierSpendRow[]) {}

  findAll(): Promise<SupplierSpendRow[]> {
    return Promise.resolve(this.rows);
  }
}

function buildSupplier(id: string, name: string): Supplier {
  return Supplier.create({
    id,
    name,
    taxId: null,
    email: null,
    phone: null,
    address: null,
    iban: null,
    notes: null,
  });
}

describe('ListSuppliersUseCase', () => {
  it('composes historical spend by currency and counts every document', async () => {
    const useCase = new ListSuppliersUseCase(
      new InMemorySupplierRepository([
        buildSupplier('supplier-1', 'Acme SL'),
        buildSupplier('supplier-2', 'No Docs SL'),
      ]),
      new InMemorySupplierSpendProvider([
        { supplierId: 'supplier-1', currency: 'USD', total: 100, documentCount: 2 },
        { supplierId: 'supplier-1', currency: 'EUR', total: 0, documentCount: 3 },
        { supplierId: 'supplier-1', currency: 'GBP', total: 25, documentCount: 1 },
      ]),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'supplier-1',
        documentCount: 6,
        spend: [
          { currency: 'GBP', total: 25 },
          { currency: 'USD', total: 100 },
        ],
      }),
      expect.objectContaining({ id: 'supplier-2', documentCount: 0, spend: [] }),
    ]);
  });
});
