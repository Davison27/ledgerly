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

    if (command.price !== undefined) {
      product.changePrice(command.price);
    }

    if (command.stock !== undefined) {
      product.changeStock(command.stock);
    }

    if (command.leasingMonthlyFee !== undefined) {
      product.changeLeasingMonthlyFee(command.leasingMonthlyFee);
    }

    if (
      command.reference !== undefined ||
      command.category !== undefined ||
      command.brand !== undefined ||
      command.description !== undefined ||
      command.image !== undefined ||
      command.tags !== undefined
    ) {
      product.changeDetails({
        reference: command.reference === undefined ? product.reference : command.reference,
        category: command.category === undefined ? product.category : command.category,
        brand: command.brand === undefined ? product.brand : command.brand,
        description: command.description === undefined ? product.description : command.description,
        image: command.image === undefined ? product.image : command.image,
        tags: command.tags === undefined ? product.tags : command.tags,
      });
    }

    await this.productRepository.save(product);

    return product;
  }
}
