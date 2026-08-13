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
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListSuppliersUseCase } from '../../application/list-suppliers/list-suppliers.use-case';
import { GetSupplierUseCase } from '../../application/get-supplier/get-supplier.use-case';
import { CreateSupplierUseCase } from '../../application/create-supplier/create-supplier.use-case';
import { UpdateSupplierUseCase } from '../../application/update-supplier/update-supplier.use-case';
import { DeleteSupplierUseCase } from '../../application/delete-supplier/delete-supplier.use-case';
import { SupplierSummaryResponse } from './supplier-summary.response';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { SupplierResponse } from './supplier.response';

@RequiresAccess('suppliers', 'view')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly getSupplierUseCase: GetSupplierUseCase,
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly deleteSupplierUseCase: DeleteSupplierUseCase,
  ) {}

  @Get()
  async list(): Promise<SupplierSummaryResponse[]> {
    const suppliers = await this.listSuppliersUseCase.execute();

    return suppliers.map((supplier) => SupplierSummaryResponse.fromSummary(supplier));
  }

  @RequiresAccess('suppliers', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateSupplierDto): Promise<SupplierResponse> {
    const supplier = await this.createSupplierUseCase.execute({
      name: dto.name,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      iban: dto.iban,
      notes: dto.notes,
    });

    return SupplierResponse.fromDomain(supplier);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<SupplierResponse> {
    const supplier = await this.getSupplierUseCase.execute(id);

    return SupplierResponse.fromDomain(supplier);
  }

  @RequiresAccess('suppliers', 'edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    const supplier = await this.updateSupplierUseCase.execute({
      id,
      name: dto.name,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      iban: dto.iban,
      notes: dto.notes,
    });

    return SupplierResponse.fromDomain(supplier);
  }

  @RequiresAccess('suppliers', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteSupplierUseCase.execute(id);
  }
}
