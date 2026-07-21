import { Product } from '../../domain/product';
import { ProductOrmEntity } from './product.orm-entity';

export class ProductMapper {
  toDomain(orm: ProductOrmEntity): Product {
    return Product.create({
      id: orm.id,
      name: orm.name,
      price: orm.price === null ? null : Number(orm.price),
    });
  }

  toOrm(product: Product): ProductOrmEntity {
    const orm = new ProductOrmEntity();
    const primitives = product.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.price = primitives.price?.toString() ?? null;

    return orm;
  }
}
