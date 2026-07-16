import { Supplier } from './supplier';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PRIMITIVES = {
  id: 'supplier-1',
  name: 'Acme Suministros SL',
  taxId: 'B12345678',
  email: 'contacto@acme.example',
  phone: '600111222',
  address: 'Calle Falsa 123',
  iban: 'ES9121000418450200051332',
  notes: 'Proveedor habitual de material de oficina',
};

describe('Supplier', () => {
  it('creates a supplier from valid primitives', () => {
    const supplier = Supplier.create(BASE_PRIMITIVES);

    expect(supplier.toPrimitives()).toEqual(BASE_PRIMITIVES);
  });

  it('allows nullable fields to be null', () => {
    const supplier = Supplier.create({
      id: 'supplier-2',
      name: 'Minimal Supplier',
      taxId: null,
      email: null,
      phone: null,
      address: null,
      iban: null,
      notes: null,
    });

    expect(supplier.taxId).toBeNull();
    expect(supplier.email).toBeNull();
    expect(supplier.phone).toBeNull();
    expect(supplier.address).toBeNull();
    expect(supplier.iban).toBeNull();
    expect(supplier.notes).toBeNull();
  });

  it('throws when the email format is invalid', () => {
    expect(() =>
      Supplier.create({ ...BASE_PRIMITIVES, email: 'not-an-email' }),
    ).toThrow(InvalidValueException);
  });

  it('renames the supplier', () => {
    const supplier = Supplier.create(BASE_PRIMITIVES);

    supplier.rename('New Name SL');

    expect(supplier.name).toBe('New Name SL');
  });

  it('changes the tax id', () => {
    const supplier = Supplier.create(BASE_PRIMITIVES);

    supplier.changeTaxId('B87654321');

    expect(supplier.taxId).toBe('B87654321');
  });

  it('changes and clears the email', () => {
    const supplier = Supplier.create(BASE_PRIMITIVES);

    supplier.changeEmail('other@acme.example');
    expect(supplier.email).toBe('other@acme.example');

    supplier.changeEmail(null);
    expect(supplier.email).toBeNull();
  });

  it('throws when changing to an invalid email', () => {
    const supplier = Supplier.create(BASE_PRIMITIVES);

    expect(() => supplier.changeEmail('bad-email')).toThrow(InvalidValueException);
  });
});
