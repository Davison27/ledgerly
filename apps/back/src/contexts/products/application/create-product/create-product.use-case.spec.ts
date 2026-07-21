import { CreateProductUseCase } from './create-product.use-case';
import { ProductRepository } from '../../domain/product.repository';
import { Product } from '../../domain/product';
import { ProductNameAlreadyExistsException } from '../../domain/errors/product-name-already-exists.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];

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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

describe('CreateProductUseCase', () => {
  it('creates a product with a price', async () => {
    const repository = new InMemoryProductRepository();
    const useCase = new CreateProductUseCase(repository, new SequentialIdGenerator());

    const product = await useCase.execute({ name: 'Diseño web', price: 500 });

    expect(product.id).toBe('generated-id-1');
    expect(product.name).toBe('Diseño web');
    expect(product.price).toBe(500);
    expect(await repository.findById(product.id)).not.toBeNull();
  });

  it('creates a product without a price', async () => {
    const repository = new InMemoryProductRepository();
    const useCase = new CreateProductUseCase(repository, new SequentialIdGenerator());

    const product = await useCase.execute({ name: 'Consultoría' });

    expect(product.price).toBeNull();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('throws ProductNameAlreadyExistsException when the name is already used', async () => {
    const repository = new InMemoryProductRepository();
    const useCase = new CreateProductUseCase(repository, new SequentialIdGenerator());

    await useCase.execute({ name: 'Diseño web', price: 500 });

    await expect(useCase.execute({ name: 'Diseño web', price: 600 })).rejects.toThrow(
      ProductNameAlreadyExistsException,
    );

    expect(await repository.findAll()).toHaveLength(1);
  });
});
