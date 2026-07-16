import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierOrmEntity } from './infrastructure/persistence/supplier.orm-entity';
import { TypeOrmSupplierRepository } from './infrastructure/persistence/typeorm-supplier.repository';
import { SuppliersController } from './infrastructure/http/suppliers.controller';
import { SUPPLIER_REPOSITORY } from './domain/supplier.repository';
import { ListSuppliersUseCase } from './application/list-suppliers/list-suppliers.use-case';
import { GetSupplierUseCase } from './application/get-supplier/get-supplier.use-case';
import { CreateSupplierUseCase } from './application/create-supplier/create-supplier.use-case';
import { UpdateSupplierUseCase } from './application/update-supplier/update-supplier.use-case';
import { DeleteSupplierUseCase } from './application/delete-supplier/delete-supplier.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierOrmEntity])],
  controllers: [SuppliersController],
  providers: [
    ListSuppliersUseCase,
    GetSupplierUseCase,
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
    { provide: SUPPLIER_REPOSITORY, useClass: TypeOrmSupplierRepository },
  ],
})
export class SuppliersModule {}
