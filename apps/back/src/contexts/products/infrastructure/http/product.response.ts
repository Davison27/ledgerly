import { Product } from '../../domain/product';

export class ProductResponse {
  id: string;
  name: string;
  price: number | null;
  stock: number;

  static fromDomain(product: Product): ProductResponse {
    const response = new ProductResponse();
    const primitives = product.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.price = primitives.price;
    response.stock = primitives.stock;

    return response;
  }
}
