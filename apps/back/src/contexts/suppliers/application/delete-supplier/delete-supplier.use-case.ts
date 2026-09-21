import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import {
  SUPPLIER_REFERENCE_COUNTER,
  SupplierReferenceCounter,
} from '../../domain/supplier-reference-counter.port';

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    @Inject(SUPPLIER_REFERENCE_COUNTER)
    private readonly supplierReferenceCounter: SupplierReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const supplier = await this.supplierRepository.findById(id);

    if (supplier === null) {
      throw new SupplierNotFoundException(id);
    }

    const referenceCount = await this.supplierReferenceCounter.count(id);

    if (referenceCount > 0) {
      await this.supplierRepository.archive(id);
      return 'archived';
    }

    await this.supplierRepository.delete(id);
    return 'deleted';
  }
}
