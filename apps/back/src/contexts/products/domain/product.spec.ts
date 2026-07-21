import { Product } from './product';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

const BASE_PRIMITIVES = {
  id: 'product-1',
  name: 'Diseño web',
  price: 500,
};

describe('Product', () => {
  it('creates a product from valid primitives', () => {
    const product = Product.create(BASE_PRIMITIVES);

    expect(product.toPrimitives()).toEqual(BASE_PRIMITIVES);
  });

  it('allows the price to be null', () => {
    const product = Product.create({
      id: 'product-2',
      name: 'Consultoría',
      price: null,
    });

    expect(product.price).toBeNull();
  });

  it('throws when the name is empty', () => {
    expect(() => Product.create({ ...BASE_PRIMITIVES, name: '  ' })).toThrow(
      InvalidValueException,
    );
  });

  it('throws when the name is longer than 200 characters', () => {
    expect(() =>
      Product.create({ ...BASE_PRIMITIVES, name: 'a'.repeat(201) }),
    ).toThrow(InvalidValueException);
  });

  it('throws when the price is negative', () => {
    expect(() => Product.create({ ...BASE_PRIMITIVES, price: -1 })).toThrow(
      InvalidValueException,
    );
  });

  it('renames the product', () => {
    const product = Product.create(BASE_PRIMITIVES);

    product.rename('Diseño gráfico');

    expect(product.name).toBe('Diseño gráfico');
  });

  it('throws when renaming to an empty name', () => {
    const product = Product.create(BASE_PRIMITIVES);

    expect(() => product.rename(' ')).toThrow(InvalidValueException);
  });

  it('changes and clears the price', () => {
    const product = Product.create(BASE_PRIMITIVES);

    product.changePrice(750);
    expect(product.price).toBe(750);

    product.changePrice(null);
    expect(product.price).toBeNull();
  });

  it('throws when changing to a negative price', () => {
    const product = Product.create(BASE_PRIMITIVES);

    expect(() => product.changePrice(-10)).toThrow(InvalidValueException);
  });
});
