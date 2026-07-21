import { Product } from './product';

export const PRODUCT_REPOSITORY = Symbol('ProductRepository');

export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByName(name: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
