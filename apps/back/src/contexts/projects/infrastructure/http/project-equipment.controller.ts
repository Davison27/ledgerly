import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ProjectEquipmentUseCase } from '../../application/project-equipment/project-equipment.use-case';
import { ProjectEquipmentRecord } from '../../domain/project-equipment.repository';
import { SaveProjectEquipmentDto } from './dtos/save-project-equipment.dto';

@RequiresAccess('projects', 'view')
@Controller('projects/:projectId/equipment')
export class ProjectEquipmentController {
  constructor(private readonly projectEquipmentUseCase: ProjectEquipmentUseCase) {}

  @Get()
  list(@Param('projectId') projectId: string): Promise<ProjectEquipmentRecord[]> {
    return this.projectEquipmentUseCase.list(projectId);
  }

  @RequiresAccess('projects', 'edit')
  @Post()
  async save(
    @Param('projectId') projectId: string,
    @Body() dto: SaveProjectEquipmentDto,
  ): Promise<ProjectEquipmentRecord[]> {
    return this.projectEquipmentUseCase.save({ projectId, ...dto });
  }

  @RequiresAccess('projects', 'edit')
  @Delete(':equipmentId')
  @HttpCode(204)
  async remove(@Param('projectId') projectId: string, @Param('equipmentId') equipmentId: string): Promise<void> {
    await this.projectEquipmentUseCase.remove(projectId, equipmentId);
  }
}
