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
import { ListEquipmentUseCase } from '../../application/list-equipment/list-equipment.use-case';
import { CreateEquipmentUseCase } from '../../application/create-equipment/create-equipment.use-case';
import { UpdateEquipmentUseCase } from '../../application/update-equipment/update-equipment.use-case';
import { DeleteEquipmentUseCase } from '../../application/delete-equipment/delete-equipment.use-case';
import { CreateEquipmentDto } from './dtos/create-equipment.dto';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { EquipmentResponse } from './equipment.response';

@RequiresAccess('equipment', 'view')
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly listEquipmentUseCase: ListEquipmentUseCase,
    private readonly createEquipmentUseCase: CreateEquipmentUseCase,
    private readonly updateEquipmentUseCase: UpdateEquipmentUseCase,
    private readonly deleteEquipmentUseCase: DeleteEquipmentUseCase,
  ) {}

  @Get()
  async list(): Promise<EquipmentResponse[]> {
    const equipment = await this.listEquipmentUseCase.execute();

    return equipment.map((equipment) => EquipmentResponse.fromDomain(equipment));
  }

  @RequiresAccess('equipment', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateEquipmentDto): Promise<EquipmentResponse> {
    const equipment = await this.createEquipmentUseCase.execute({
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
      reference: dto.reference,
      category: dto.category,
      brand: dto.brand,
      description: dto.description,
      image: dto.image,
      tags: dto.tags,
      leasingMonthlyFee: dto.leasingMonthlyFee,
    });

    return EquipmentResponse.fromDomain(equipment);
  }

  @RequiresAccess('equipment', 'edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<EquipmentResponse> {
    const equipment = await this.updateEquipmentUseCase.execute({
      id,
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
      reference: dto.reference,
      category: dto.category,
      brand: dto.brand,
      description: dto.description,
      image: dto.image,
      tags: dto.tags,
      leasingMonthlyFee: dto.leasingMonthlyFee,
    });

    return EquipmentResponse.fromDomain(equipment);
  }

  @RequiresAccess('equipment', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteEquipmentUseCase.execute(id);
  }
}
