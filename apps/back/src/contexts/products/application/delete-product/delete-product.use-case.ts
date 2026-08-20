import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product.repository';
import { ProductNotFoundException } from '../../domain/errors/product-not-found.exception';

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const product = await this.productRepository.findById(id);

    if (product === null) {
      throw new ProductNotFoundException(id);
    }

    await this.productRepository.delete(id);
  }
}
