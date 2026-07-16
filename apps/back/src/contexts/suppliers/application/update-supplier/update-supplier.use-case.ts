import { Inject, Injectable } from '@nestjs/common';
import { Supplier } from '../../domain/supplier';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import { UpdateSupplierCommand } from './update-supplier.command';

@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(command: UpdateSupplierCommand): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(command.id);

    if (supplier === null) {
      throw new SupplierNotFoundException(command.id);
    }

    if (command.taxId !== undefined && command.taxId !== supplier.taxId) {
      if (command.taxId !== null) {
        const existing = await this.supplierRepository.findByTaxId(command.taxId);

        if (existing !== null) {
          throw new SupplierTaxIdAlreadyExistsException(command.taxId);
        }
      }
    }

    if (command.name !== undefined) {
      supplier.rename(command.name);
    }

    if (command.taxId !== undefined) {
      supplier.changeTaxId(command.taxId);
    }

    if (command.email !== undefined) {
      supplier.changeEmail(command.email);
    }

    if (command.phone !== undefined) {
      supplier.changePhone(command.phone);
    }

    if (command.address !== undefined) {
      supplier.changeAddress(command.address);
    }

    if (command.iban !== undefined) {
      supplier.changeIban(command.iban);
    }

    if (command.notes !== undefined) {
      supplier.changeNotes(command.notes);
    }

    await this.supplierRepository.save(supplier);

    return supplier;
  }
}
