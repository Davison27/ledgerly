import { Supplier } from '../../domain/supplier';
import { SupplierRepository } from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import { UpdateSupplierUseCase } from './update-supplier.use-case';

class InMemorySupplierRepository implements SupplierRepository {
  constructor(private readonly suppliers: Supplier[]) {}

  findAll(): Promise<Supplier[]> {
    return Promise.resolve(this.suppliers);
  }

  findById(id: string): Promise<Supplier | null> {
    return Promise.resolve(this.suppliers.find((supplier) => supplier.id === id) ?? null);
  }

  findByTaxId(taxId: string): Promise<Supplier | null> {
    return Promise.resolve(this.suppliers.find((supplier) => supplier.taxId === taxId) ?? null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  archive(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function buildSupplier(overrides: Partial<Parameters<typeof Supplier.create>[0]> = {}): Supplier {
  return Supplier.create({
    id: 'supplier-1',
    name: 'Acme SL',
    taxId: 'B12345678',
    email: null,
    phone: null,
    address: null,
    iban: null,
    notes: null,
    ...overrides,
  });
}

describe('UpdateSupplierUseCase', () => {
  it('normalizes equivalent tax-ID input', async () => {
    const supplier = buildSupplier();
    const useCase = new UpdateSupplierUseCase(new InMemorySupplierRepository([supplier]));

    const updated = await useCase.execute({ id: supplier.id, taxId: ' b-123.456 78 ' });

    expect(updated.taxId).toBe('B12345678');
  });

  it('normalizes empty tax-ID input to null', async () => {
    const supplier = buildSupplier();
    const useCase = new UpdateSupplierUseCase(new InMemorySupplierRepository([supplier]));

    const updated = await useCase.execute({ id: supplier.id, taxId: ' .- ' });

    expect(updated.taxId).toBeNull();
  });

  it('rejects an archived supplier tax ID conflict', async () => {
    const current = buildSupplier();
    const archived = buildSupplier({ id: 'supplier-2', taxId: 'B87654321', archivedAt: '2026-01-01T00:00:00.000Z' });
    const useCase = new UpdateSupplierUseCase(new InMemorySupplierRepository([current, archived]));

    await expect(useCase.execute({ id: current.id, taxId: ' b-876.543 21 ' })).rejects.toThrow(
      SupplierTaxIdAlreadyExistsException,
    );
  });

  it('rejects an unknown supplier', async () => {
    const useCase = new UpdateSupplierUseCase(new InMemorySupplierRepository([]));

    await expect(useCase.execute({ id: 'missing-supplier', taxId: 'B12345678' })).rejects.toThrow(
      SupplierNotFoundException,
    );
  });
});
