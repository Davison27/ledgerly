import { Supplier } from '../../domain/supplier';
import { SupplierOrmEntity } from './supplier.orm-entity';

export class SupplierMapper {
  toDomain(orm: SupplierOrmEntity): Supplier {
    return Supplier.create({
      id: orm.id,
      name: orm.name,
      taxId: orm.taxId,
      email: orm.email,
      phone: orm.phone,
      address: orm.address,
      iban: orm.iban,
      notes: orm.notes,
    });
  }

  toOrm(supplier: Supplier): SupplierOrmEntity {
    const orm = new SupplierOrmEntity();
    const primitives = supplier.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.taxId = primitives.taxId;
    orm.email = primitives.email;
    orm.phone = primitives.phone;
    orm.address = primitives.address;
    orm.iban = primitives.iban;
    orm.notes = primitives.notes;

    return orm;
  }
}
