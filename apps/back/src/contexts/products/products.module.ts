import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { TypeOrmProductRepository } from './infrastructure/persistence/typeorm-product.repository';
import { ProductsController } from './infrastructure/http/products.controller';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { ListProductsUseCase } from './application/list-products/list-products.use-case';
import { CreateProductUseCase } from './application/create-product/create-product.use-case';
import { UpdateProductUseCase } from './application/update-product/update-product.use-case';
import { DeleteProductUseCase } from './application/delete-product/delete-product.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOrmEntity])],
  controllers: [ProductsController],
  providers: [
    ListProductsUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
