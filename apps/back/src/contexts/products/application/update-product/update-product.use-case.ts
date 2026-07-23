import { Inject, Injectable } from '@nestjs/common';
import { Product } from '../../domain/product';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product.repository';
import { ProductNotFoundException } from '../../domain/errors/product-not-found.exception';
import { ProductNameAlreadyExistsException } from '../../domain/errors/product-name-already-exists.exception';
import { UpdateProductCommand } from './update-product.command';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    const product = await this.productRepository.findById(command.id);

    if (product === null) {
      throw new ProductNotFoundException(command.id);
    }

    if (command.name !== undefined && command.name !== product.name) {
      const existing = await this.productRepository.findByName(command.name);

      if (existing !== null) {
        throw new ProductNameAlreadyExistsException(command.name);
      }
    }

    if (command.name !== undefined) {
      product.rename(command.name);
    }

    product.changePrice(command.price);

    if (command.stock !== undefined) {
      product.changeStock(command.stock);
    }

    await this.productRepository.save(product);

    return product;
  }
}
