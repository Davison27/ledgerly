import { Product } from '../../domain/product';
import { ProductNotFoundException } from '../../domain/errors/product-not-found.exception';
import { ProductRepository } from '../../domain/product.repository';
import { DeleteProductUseCase } from './delete-product.use-case';

class InMemoryProductRepository implements ProductRepository {
  private products: Product[];
  readonly deletedIds: string[] = [];

  constructor(products: Product[] = []) {
    this.products = products;
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
    this.products.push(product);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.deletedIds.push(id);
    this.products = this.products.filter((product) => product.id !== id);
    return Promise.resolve();
  }

  snapshot(): Product[] {
    return [...this.products];
  }
}

describe('DeleteProductUseCase', () => {
  it('rejects an unknown product without invoking deletion', async () => {
    const repository = new InMemoryProductRepository();
    const useCase = new DeleteProductUseCase(repository);

    await expect(useCase.execute('missing-product')).rejects.toThrow(ProductNotFoundException);

    expect(repository.deletedIds).toEqual([]);
  });

  it('deletes an existing product', async () => {
    const product = Product.create({ id: 'product-1', name: 'Product', price: 10, stock: 1 });
    const repository = new InMemoryProductRepository([product]);
    const useCase = new DeleteProductUseCase(repository);

    await useCase.execute('product-1');

    expect(repository.snapshot()).toEqual([]);
  });
});
