import { Inject, Injectable } from '@nestjs/common';
import { Supplier } from '../../domain/supplier';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../../shared/domain/id-generator.port';
import { CreateSupplierCommand } from './create-supplier.command';

@Injectable()
export class CreateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateSupplierCommand): Promise<Supplier> {
    const taxId = command.taxId ?? null;

    if (taxId !== null) {
      const existing = await this.supplierRepository.findByTaxId(taxId);

      if (existing !== null) {
        throw new SupplierTaxIdAlreadyExistsException(taxId);
      }
    }

    const supplier = Supplier.create({
      id: this.idGenerator.generate(),
      name: command.name,
      taxId,
      email: command.email ?? null,
      phone: command.phone ?? null,
      address: command.address ?? null,
      iban: command.iban ?? null,
      notes: command.notes ?? null,
    });

    await this.supplierRepository.save(supplier);

    return supplier;
  }
}
