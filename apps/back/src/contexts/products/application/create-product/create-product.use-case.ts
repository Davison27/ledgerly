import { Inject, Injectable } from '@nestjs/common';
import { Product } from '../../domain/product';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product.repository';
import { ProductNameAlreadyExistsException } from '../../domain/errors/product-name-already-exists.exception';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../../shared/domain/id-generator.port';
import { CreateProductCommand } from './create-product.command';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const existing = await this.productRepository.findByName(command.name);

    if (existing !== null) {
      throw new ProductNameAlreadyExistsException(command.name);
    }

    const product = Product.create({
      id: this.idGenerator.generate(),
      name: command.name,
      price: command.price ?? null,
      stock: command.stock ?? 0,
      reference: command.reference,
      category: command.category,
      brand: command.brand,
      description: command.description,
      image: command.image,
      tags: command.tags,
      leasingMonthlyFee: command.leasingMonthlyFee,
    });

    await this.productRepository.save(product);

    return product;
  }
}
