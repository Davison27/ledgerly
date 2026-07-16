import { CreateSupplierUseCase } from './create-supplier.use-case';
import { SupplierRepository } from '../../domain/supplier.repository';
import { Supplier } from '../../domain/supplier';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemorySupplierRepository implements SupplierRepository {
  private suppliers: Supplier[] = [];

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
    const index = this.suppliers.findIndex((existing) => existing.id === supplier.id);

    if (index === -1) {
      this.suppliers.push(supplier);
    } else {
      this.suppliers[index] = supplier;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.suppliers = this.suppliers.filter((supplier) => supplier.id !== id);
    return Promise.resolve();
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

describe('CreateSupplierUseCase', () => {
  it('creates a supplier when the tax id is not taken', async () => {
    const repository = new InMemorySupplierRepository();
    const useCase = new CreateSupplierUseCase(repository, new SequentialIdGenerator());

    const supplier = await useCase.execute({ name: 'Acme SL', taxId: 'B12345678' });

    expect(supplier.id).toBe('generated-id-1');
    expect(supplier.name).toBe('Acme SL');
    expect(supplier.taxId).toBe('B12345678');
    expect(await repository.findById(supplier.id)).not.toBeNull();
  });

  it('creates a supplier without checking uniqueness when taxId is null', async () => {
    const repository = new InMemorySupplierRepository();
    const useCase = new CreateSupplierUseCase(repository, new SequentialIdGenerator());

    const supplier = await useCase.execute({ name: 'Acme SL' });

    expect(supplier.taxId).toBeNull();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('throws SupplierTaxIdAlreadyExistsException when the tax id is already used', async () => {
    const repository = new InMemorySupplierRepository();
    const useCase = new CreateSupplierUseCase(repository, new SequentialIdGenerator());

    await useCase.execute({ name: 'Existing SL', taxId: 'B12345678' });

    await expect(
      useCase.execute({ name: 'Acme SL', taxId: 'B12345678' }),
    ).rejects.toThrow(SupplierTaxIdAlreadyExistsException);

    expect(await repository.findAll()).toHaveLength(1);
  });
});
