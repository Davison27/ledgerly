import { Product } from '../../domain/product';
import { ProductOrmEntity } from './product.orm-entity';

export class ProductMapper {
  toDomain(orm: ProductOrmEntity, image: string | null): Product {
    return Product.create({
      id: orm.id,
      name: orm.name,
      price: orm.price === null ? null : Number(orm.price),
      stock: orm.stock,
      reference: orm.reference,
      category: orm.category,
      brand: orm.brand,
      description: orm.description,
      image,
      tags: orm.tags,
      leasingMonthlyFee: orm.leasingMonthlyFee === null ? null : Number(orm.leasingMonthlyFee),
    });
  }

  toOrm(product: Product): ProductOrmEntity {
    const orm = new ProductOrmEntity();
    const primitives = product.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.price = primitives.price?.toString() ?? null;
    orm.stock = primitives.stock;
    orm.reference = primitives.reference ?? null;
    orm.category = primitives.category ?? null;
    orm.brand = primitives.brand ?? null;
    orm.description = primitives.description ?? null;
    orm.tags = primitives.tags ?? [];
    orm.leasingMonthlyFee = primitives.leasingMonthlyFee?.toString() ?? null;

    return orm;
  }
}
