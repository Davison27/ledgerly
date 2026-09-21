import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import {
  SUPPLIER_PHYSICAL_DOCUMENT_REFERENCE_COUNTER,
  PhysicalDocumentReferenceCounter,
} from '../../domain/physical-document-reference-counter.port';

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    @Inject(SUPPLIER_PHYSICAL_DOCUMENT_REFERENCE_COUNTER)
    private readonly supplierPhysicalDocumentReferenceCounter: PhysicalDocumentReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const supplier = await this.supplierRepository.findById(id);

    if (supplier === null) {
      throw new SupplierNotFoundException(id);
    }

    const referenceCount = await this.supplierPhysicalDocumentReferenceCounter.countPhysicalDocumentReferences(id);

    if (referenceCount > 0) {
      await this.supplierRepository.archive(id);
      return 'archived';
    }

    await this.supplierRepository.delete(id);
    return 'deleted';
  }
}
