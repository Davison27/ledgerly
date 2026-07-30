import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ProjectProductsUseCase } from '../../application/project-products/project-products.use-case';
import { ProjectProductRecord } from '../../domain/project-product.repository';
import { SaveProjectProductDto } from './dtos/save-project-product.dto';

@RequiresAccess('projects', 'view')
@Controller('projects/:projectId/products')
export class ProjectProductsController {
  constructor(private readonly projectProductsUseCase: ProjectProductsUseCase) {}

  @Get()
  list(@Param('projectId') projectId: string): Promise<ProjectProductRecord[]> {
    return this.projectProductsUseCase.list(projectId);
  }

  @RequiresAccess('projects', 'edit')
  @Post()
  async save(
    @Param('projectId') projectId: string,
    @Body() dto: SaveProjectProductDto,
  ): Promise<ProjectProductRecord[]> {
    return this.projectProductsUseCase.save({ projectId, ...dto });
  }

  @RequiresAccess('projects', 'edit')
  @Delete(':productId')
  @HttpCode(204)
  async remove(@Param('projectId') projectId: string, @Param('productId') productId: string): Promise<void> {
    await this.projectProductsUseCase.remove(projectId, productId);
  }
}
