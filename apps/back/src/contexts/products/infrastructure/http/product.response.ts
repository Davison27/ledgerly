import { Product } from '../../domain/product';

export class ProductResponse {
  id: string;
  name: string;
  price: number | null;

  static fromDomain(product: Product): ProductResponse {
    const response = new ProductResponse();
    const primitives = product.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.price = primitives.price;

    return response;
  }
}
