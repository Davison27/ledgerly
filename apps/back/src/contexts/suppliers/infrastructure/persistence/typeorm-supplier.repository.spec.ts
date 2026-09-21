import { QueryFailedError, Repository } from 'typeorm';
import { Supplier } from '../../domain/supplier';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import { TypeOrmSupplierRepository } from './typeorm-supplier.repository';
import { SupplierOrmEntity } from './supplier.orm-entity';

function buildSupplier(): Supplier {
  return Supplier.create({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Supplier',
    taxId: 'B12345678',
    email: null,
    phone: null,
    address: null,
    iban: null,
    notes: null,
  });
}

function queryFailure(code: string, constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT INTO suppliers', [], { code, constraint } as unknown as Error);
}

describe('TypeOrmSupplierRepository.save', () => {
  it('maps the tax-ID unique violation to a domain conflict', async () => {
    const save = jest.fn().mockRejectedValue(queryFailure('23505', 'UQ_suppliers_tax_id'));
    const repository = new TypeOrmSupplierRepository({ save } as unknown as Repository<SupplierOrmEntity>);

    await expect(repository.save(buildSupplier())).rejects.toEqual(
      new SupplierTaxIdAlreadyExistsException('B12345678'),
    );
  });

  it('rethrows unrelated unique violations', async () => {
    const error = queryFailure('23505', 'UQ_suppliers_other');
    const save = jest.fn().mockRejectedValue(error);
    const repository = new TypeOrmSupplierRepository({ save } as unknown as Repository<SupplierOrmEntity>);

    await expect(repository.save(buildSupplier())).rejects.toBe(error);
  });

  it('rethrows non-unique failures', async () => {
    const error = queryFailure('23503', 'FK_suppliers_other');
    const save = jest.fn().mockRejectedValue(error);
    const repository = new TypeOrmSupplierRepository({ save } as unknown as Repository<SupplierOrmEntity>);

    await expect(repository.save(buildSupplier())).rejects.toBe(error);
  });
});
