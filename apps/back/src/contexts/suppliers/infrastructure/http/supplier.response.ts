import { Supplier } from '../../domain/supplier';

export class SupplierResponse {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;

  static fromDomain(supplier: Supplier): SupplierResponse {
    const response = new SupplierResponse();
    const primitives = supplier.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.taxId = primitives.taxId;
    response.email = primitives.email;
    response.phone = primitives.phone;
    response.address = primitives.address;
    response.iban = primitives.iban;
    response.notes = primitives.notes;

    return response;
  }
}
