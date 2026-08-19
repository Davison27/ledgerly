import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/product';
import { ProductRepository } from '../../domain/product.repository';
import { ProductOrmEntity } from './product.orm-entity';
import { ProductMapper } from './product.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  private readonly mapper = new ProductMapper();

  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repository: Repository<ProductOrmEntity>,
  ) {}

  async findAll(): Promise<Product[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository.find({ order: { name: 'ASC' }, take: limit + 1 });

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Products');

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async findById(id: string): Promise<Product | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async findByName(name: string): Promise<Product | null> {
    const orm = await this.repository.findOne({ where: { name } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async save(product: Product): Promise<void> {
    await this.repository.save(this.mapper.toOrm(product));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
