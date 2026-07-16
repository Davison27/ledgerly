import { Inject, Injectable } from '@nestjs/common';
import { Supplier } from '../../domain/supplier';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';

@Injectable()
export class GetSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(id);

    if (supplier === null) {
      throw new SupplierNotFoundException(id);
    }

    return supplier;
  }
}
