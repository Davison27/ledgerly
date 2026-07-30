import { Product } from '../../domain/product';

export class ProductResponse {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  reference: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  tags: string[];

  static fromDomain(product: Product): ProductResponse {
    const response = new ProductResponse();
    const primitives = product.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.price = primitives.price;
    response.stock = primitives.stock;
    response.reference = primitives.reference ?? null;
    response.category = primitives.category ?? null;
    response.brand = primitives.brand ?? null;
    response.description = primitives.description ?? null;
    response.image = primitives.image ?? null;
    response.tags = primitives.tags ?? [];

    return response;
  }
}
