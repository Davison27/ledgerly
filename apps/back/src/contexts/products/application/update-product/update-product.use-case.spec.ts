import { UpdateProductUseCase } from './update-product.use-case';
import { ProductRepository } from '../../domain/product.repository';
import { Product } from '../../domain/product';
import { ProductNotFoundException } from '../../domain/errors/product-not-found.exception';
import { ProductNameAlreadyExistsException } from '../../domain/errors/product-name-already-exists.exception';

class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];

  constructor(initial: Product[] = []) {
    this.products = initial;
  }

  findAll(): Promise<Product[]> {
    return Promise.resolve([...this.products]);
  }

  findById(id: string): Promise<Product | null> {
    return Promise.resolve(this.products.find((product) => product.id === id) ?? null);
  }

  findByName(name: string): Promise<Product | null> {
    return Promise.resolve(this.products.find((product) => product.name === name) ?? null);
  }

  save(product: Product): Promise<void> {
    const index = this.products.findIndex((existing) => existing.id === product.id);

    if (index === -1) {
      this.products.push(product);
    } else {
      this.products[index] = product;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.products = this.products.filter((product) => product.id !== id);
    return Promise.resolve();
  }
}

describe('UpdateProductUseCase', () => {
  it('renames the product and changes its price', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({ id: 'product-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    const product = await useCase.execute({ id: 'product-1', name: 'Diseño gráfico', price: 600 });

    expect(product.name).toBe('Diseño gráfico');
    expect(product.price).toBe(600);
  });

  it('clears the price when it is set to null', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({ id: 'product-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    const product = await useCase.execute({ id: 'product-1', price: null });

    expect(product.price).toBeNull();
  });

  it('changes the stock when it is given', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({ id: 'product-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    const product = await useCase.execute({ id: 'product-1', price: 500, stock: 30 });

    expect(product.stock).toBe(30);
  });

  it('leaves the stock untouched when it is omitted', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({ id: 'product-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    const product = await useCase.execute({ id: 'product-1', price: 500 });

    expect(product.stock).toBe(10);
  });

  it('updates and clears catalog details independently from billing data', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({
        id: 'product-1',
        name: 'Diseño web',
        price: 500,
        stock: 10,
        reference: 'SERV-001',
        category: 'Diseño',
        tags: ['branding'],
      }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    const product = await useCase.execute({
      id: 'product-1',
      description: 'Diseño web corporativo.',
      category: null,
      tags: ['web'],
    });

    expect(product.reference).toBe('SERV-001');
    expect(product.category).toBeNull();
    expect(product.description).toBe('Diseño web corporativo.');
    expect(product.tags).toEqual(['web']);
    expect(product.price).toBe(500);
    expect(product.stock).toBe(10);
  });

  it('throws ProductNotFoundException when the product does not exist', async () => {
    const repository = new InMemoryProductRepository();
    const useCase = new UpdateProductUseCase(repository);

    await expect(useCase.execute({ id: 'missing-id', price: null })).rejects.toThrow(
      ProductNotFoundException,
    );
  });

  it('throws ProductNameAlreadyExistsException when renaming to a name already in use', async () => {
    const repository = new InMemoryProductRepository([
      Product.create({ id: 'product-1', name: 'Diseño web', price: 500, stock: 10 }),
      Product.create({ id: 'product-2', name: 'Consultoría', price: null, stock: 0 }),
    ]);
    const useCase = new UpdateProductUseCase(repository);

    await expect(
      useCase.execute({ id: 'product-2', name: 'Diseño web', price: null }),
    ).rejects.toThrow(ProductNameAlreadyExistsException);
  });
});
