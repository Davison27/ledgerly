import { Inject, Injectable } from '@nestjs/common';
import { Supplier } from '../../domain/supplier';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';

@Injectable()
export class ListSuppliersUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  execute(): Promise<Supplier[]> {
    return this.supplierRepository.findAll();
  }
}
