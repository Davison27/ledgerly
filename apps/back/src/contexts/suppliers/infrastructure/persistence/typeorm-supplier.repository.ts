import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../domain/supplier';
import { SupplierRepository } from '../../domain/supplier.repository';
import { SupplierOrmEntity } from './supplier.orm-entity';
import { SupplierMapper } from './supplier.mapper';

@Injectable()
export class TypeOrmSupplierRepository implements SupplierRepository {
  private readonly mapper = new SupplierMapper();

  constructor(
    @InjectRepository(SupplierOrmEntity)
    private readonly repository: Repository<SupplierOrmEntity>,
  ) {}

  async findAll(): Promise<Supplier[]> {
    const rows = await this.repository.find({ order: { name: 'ASC' } });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async findById(id: string): Promise<Supplier | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async findByTaxId(taxId: string): Promise<Supplier | null> {
    const orm = await this.repository.findOne({ where: { taxId } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async save(supplier: Supplier): Promise<void> {
    await this.repository.save(this.mapper.toOrm(supplier));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
