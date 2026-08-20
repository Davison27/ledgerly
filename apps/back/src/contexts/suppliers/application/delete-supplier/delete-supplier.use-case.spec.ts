import { Supplier } from '../../domain/supplier';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { SupplierRepository } from '../../domain/supplier.repository';
import { DeleteSupplierUseCase } from './delete-supplier.use-case';

class InMemorySupplierRepository implements SupplierRepository {
  private suppliers: Supplier[];
  readonly deletedIds: string[] = [];

  constructor(suppliers: Supplier[] = []) {
    this.suppliers = suppliers;
  }

  findAll(): Promise<Supplier[]> {
    return Promise.resolve([...this.suppliers]);
  }

  findById(id: string): Promise<Supplier | null> {
    return Promise.resolve(this.suppliers.find((supplier) => supplier.id === id) ?? null);
  }

  findByTaxId(taxId: string): Promise<Supplier | null> {
    return Promise.resolve(this.suppliers.find((supplier) => supplier.taxId === taxId) ?? null);
  }

  save(supplier: Supplier): Promise<void> {
    this.suppliers.push(supplier);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.deletedIds.push(id);
    this.suppliers = this.suppliers.filter((supplier) => supplier.id !== id);
    return Promise.resolve();
  }
}

describe('DeleteSupplierUseCase', () => {
  it('rejects an unknown supplier without invoking deletion', async () => {
    const repository = new InMemorySupplierRepository();
    const useCase = new DeleteSupplierUseCase(repository);

    await expect(useCase.execute('missing-supplier')).rejects.toThrow(SupplierNotFoundException);

    expect(repository.deletedIds).toEqual([]);
  });
});
