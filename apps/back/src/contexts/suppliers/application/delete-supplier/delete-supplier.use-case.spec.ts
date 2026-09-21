import { Supplier } from '../../domain/supplier';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { SupplierRepository } from '../../domain/supplier.repository';
import { PhysicalDocumentReferenceCounter } from '../../domain/physical-document-reference-counter.port';
import { DeleteSupplierUseCase } from './delete-supplier.use-case';

class InMemorySupplierRepository implements SupplierRepository {
  private suppliers: Supplier[];
  readonly deletedIds: string[] = [];
  readonly archivedIds: string[] = [];

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

  archive(id: string): Promise<void> {
    this.archivedIds.push(id);
    return Promise.resolve();
  }
}

class FakeSupplierPhysicalDocumentReferenceCounter implements PhysicalDocumentReferenceCounter {
  constructor(private readonly references: number) {}

  countPhysicalDocumentReferences(): Promise<number> {
    return Promise.resolve(this.references);
  }
}

describe('DeleteSupplierUseCase', () => {
  it('rejects an unknown supplier without invoking deletion', async () => {
    const repository = new InMemorySupplierRepository();
    const useCase = new DeleteSupplierUseCase(repository, new FakeSupplierPhysicalDocumentReferenceCounter(0));

    await expect(useCase.execute('missing-supplier')).rejects.toThrow(SupplierNotFoundException);

    expect(repository.deletedIds).toEqual([]);
  });

  it('archives a supplier with document references', async () => {
    const supplier = Supplier.create({
      id: 'supplier-1',
      name: 'Acme SL',
      taxId: null,
      email: null,
      phone: null,
      address: null,
      iban: null,
      notes: null,
    });
    const repository = new InMemorySupplierRepository([supplier]);
    const useCase = new DeleteSupplierUseCase(repository, new FakeSupplierPhysicalDocumentReferenceCounter(1));

    await expect(useCase.execute('supplier-1')).resolves.toBe('archived');

    expect(repository.archivedIds).toEqual(['supplier-1']);
    expect(repository.deletedIds).toEqual([]);
  });

  it('deletes an unreferenced supplier', async () => {
    const supplier = Supplier.create({
      id: 'supplier-1',
      name: 'Acme SL',
      taxId: null,
      email: null,
      phone: null,
      address: null,
      iban: null,
      notes: null,
    });
    const repository = new InMemorySupplierRepository([supplier]);
    const useCase = new DeleteSupplierUseCase(repository, new FakeSupplierPhysicalDocumentReferenceCounter(0));

    await expect(useCase.execute('supplier-1')).resolves.toBe('deleted');

    expect(repository.deletedIds).toEqual(['supplier-1']);
    expect(repository.archivedIds).toEqual([]);
  });
});
