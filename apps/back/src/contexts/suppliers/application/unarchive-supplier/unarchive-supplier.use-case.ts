import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';

@Injectable()
export class UnarchiveSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const supplier = await this.supplierRepository.findById(id);

    if (supplier === null) {
      throw new SupplierNotFoundException(id);
    }

    if (this.supplierRepository.unarchive === undefined) {
      throw new Error('Supplier repository does not support unarchiving');
    }

    await this.supplierRepository.unarchive(id);
  }
}
