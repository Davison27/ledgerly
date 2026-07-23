import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ListProductsUseCase } from '../../application/list-products/list-products.use-case';
import { CreateProductUseCase } from '../../application/create-product/create-product.use-case';
import { UpdateProductUseCase } from '../../application/update-product/update-product.use-case';
import { DeleteProductUseCase } from '../../application/delete-product/delete-product.use-case';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductResponse } from './product.response';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Get()
  async list(): Promise<ProductResponse[]> {
    const products = await this.listProductsUseCase.execute();

    return products.map((product) => ProductResponse.fromDomain(product));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    const product = await this.createProductUseCase.execute({
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
    });

    return ProductResponse.fromDomain(product);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const product = await this.updateProductUseCase.execute({
      id,
      name: dto.name,
      price: dto.price ?? null,
      stock: dto.stock,
    });

    return ProductResponse.fromDomain(product);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteProductUseCase.execute(id);
  }
}
