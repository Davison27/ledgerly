import { Supplier } from '../../domain/supplier';
import { SupplierRepository } from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { UnarchiveSupplierUseCase } from './unarchive-supplier.use-case';

function buildSupplier(): Supplier {
  return Supplier.create({
    id: 'supplier-1',
    name: 'Acme SL',
    taxId: null,
    email: null,
    phone: null,
    address: null,
    iban: null,
    notes: null,
  });
}

describe('UnarchiveSupplierUseCase', () => {
  it('clears the archive marker for an existing supplier', async () => {
    const unarchive = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findById: jest.fn().mockResolvedValue(buildSupplier()),
      unarchive,
    } as unknown as SupplierRepository;
    const useCase = new UnarchiveSupplierUseCase(repository);

    await useCase.execute('supplier-1');

    expect(unarchive).toHaveBeenCalledWith('supplier-1');
  });

  it('rejects an unknown supplier', async () => {
    const unarchive = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      unarchive,
    } as unknown as SupplierRepository;
    const useCase = new UnarchiveSupplierUseCase(repository);

    await expect(useCase.execute('missing-supplier')).rejects.toThrow(SupplierNotFoundException);
    expect(unarchive).not.toHaveBeenCalled();
  });
});
