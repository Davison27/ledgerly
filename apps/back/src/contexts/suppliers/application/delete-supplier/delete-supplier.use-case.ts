import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  execute(id: string): Promise<void> {
    return this.supplierRepository.delete(id);
  }
}
