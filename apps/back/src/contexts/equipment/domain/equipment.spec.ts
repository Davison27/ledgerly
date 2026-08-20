import { Equipment } from './equipment';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PRIMITIVES = {
  id: 'equipment-1',
  name: 'Diseño web',
  price: 500,
  stock: 10,
};

describe('Equipment', () => {
  it('creates equipment from valid primitives', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    expect(equipment.toPrimitives()).toEqual({
      ...BASE_PRIMITIVES,
      reference: null,
      category: null,
      brand: null,
      description: null,
      image: null,
      tags: [],
      leasingMonthlyFee: null,
    });
  });

  it('allows the price to be null', () => {
    const equipment = Equipment.create({
      id: 'equipment-2',
      name: 'Consultoría',
      price: null,
      stock: 0,
    });

    expect(equipment.price).toBeNull();
  });

  it('allows the stock to be zero', () => {
    const equipment = Equipment.create({ ...BASE_PRIMITIVES, stock: 0 });

    expect(equipment.stock).toBe(0);
  });

  it('throws when the stock is negative', () => {
    expect(() => Equipment.create({ ...BASE_PRIMITIVES, stock: -1 })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when the stock is not an integer', () => {
    expect(() => Equipment.create({ ...BASE_PRIMITIVES, stock: 1.5 })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when the name is empty', () => {
    expect(() => Equipment.create({ ...BASE_PRIMITIVES, name: '  ' })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when the name is longer than 200 characters', () => {
    expect(() =>
      Equipment.create({ ...BASE_PRIMITIVES, name: 'a'.repeat(201) }),
    ).toThrow(InvalidValueException);
  });

  it('throws when the price is negative', () => {
    expect(() => Equipment.create({ ...BASE_PRIMITIVES, price: -1 })).toThrow(
      InvalidValueException,
    );
  });

  it('renames the equipment', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    equipment.rename('Diseño gráfico');

    expect(equipment.name).toBe('Diseño gráfico');
  });

  it('throws when renaming to an empty name', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    expect(() => equipment.rename(' ')).toThrow(InvalidValueException);
  });

  it('changes and clears the price', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    equipment.changePrice(750);
    expect(equipment.price).toBe(750);

    equipment.changePrice(null);
    expect(equipment.price).toBeNull();
  });

  it('throws when changing to a negative price', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    expect(() => equipment.changePrice(-10)).toThrow(InvalidValueException);
  });

  it('stores an optional monthly leasing payment', () => {
    const equipment = Equipment.create({ ...BASE_PRIMITIVES, leasingMonthlyFee: 1250 });

    expect(equipment.leasingMonthlyFee).toBe(1250);

    equipment.changeLeasingMonthlyFee(null);

    expect(equipment.leasingMonthlyFee).toBeNull();
  });

  it('throws when the monthly leasing payment is negative', () => {
    expect(() => Equipment.create({ ...BASE_PRIMITIVES, leasingMonthlyFee: -1 })).toThrow(
      InvalidValueException,
    );
  });

  it('changes the stock', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    equipment.changeStock(25);

    expect(equipment.stock).toBe(25);
  });

  it('throws when changing to a negative stock', () => {
    const equipment = Equipment.create(BASE_PRIMITIVES);

    expect(() => equipment.changeStock(-1)).toThrow(InvalidValueException);
  });

  it('stores searchable catalog details', () => {
    const equipment = Equipment.create({
      ...BASE_PRIMITIVES,
      reference: 'SERV-001',
      category: 'Diseño',
      brand: 'Ledgerly Studio',
      description: 'Diseño de identidad visual para pequeñas empresas.',
      tags: ['branding', 'premium', 'branding'],
    });

    expect(equipment.toPrimitives()).toMatchObject({
      reference: 'SERV-001',
      category: 'Diseño',
      brand: 'Ledgerly Studio',
      tags: ['branding', 'premium'],
    });
  });
});
