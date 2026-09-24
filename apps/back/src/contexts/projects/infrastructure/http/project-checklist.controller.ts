import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { AddProjectChecklistItemUseCase } from '../../application/add-project-checklist-item/add-project-checklist-item.use-case';
import { DeleteProjectChecklistItemUseCase } from '../../application/delete-project-checklist-item/delete-project-checklist-item.use-case';
import { GetProjectChecklistUseCase } from '../../application/get-project-checklist/get-project-checklist.use-case';
import { UpdateProjectChecklistItemUseCase } from '../../application/update-project-checklist-item/update-project-checklist-item.use-case';
import { CreateProjectChecklistItemDto } from './dtos/create-project-checklist-item.dto';
import { UpdateProjectChecklistItemDto } from './dtos/update-project-checklist-item.dto';
import { ProjectChecklistResponse } from './project-checklist.response';

@RequiresAccess('projects', 'view')
@RequiresAccess('planning', 'view')
@Controller('projects/:projectId/checklist')
export class ProjectChecklistController {
  constructor(
    private readonly getChecklistUseCase: GetProjectChecklistUseCase,
    private readonly addItemUseCase: AddProjectChecklistItemUseCase,
    private readonly updateItemUseCase: UpdateProjectChecklistItemUseCase,
    private readonly deleteItemUseCase: DeleteProjectChecklistItemUseCase,
  ) {}

  @Get()
  async get(@Param('projectId') projectId: string): Promise<ProjectChecklistResponse> {
    return ProjectChecklistResponse.fromDomain(await this.getChecklistUseCase.execute(projectId));
  }

  @RequiresAccess('projects', 'edit')
  @RequiresAccess('planning', 'edit')
  @Post('items')
  @HttpCode(201)
  async addItem(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectChecklistItemDto,
  ): Promise<ProjectChecklistResponse> {
    return ProjectChecklistResponse.fromDomain(await this.addItemUseCase.execute(projectId, dto.text));
  }

  @RequiresAccess('projects', 'edit')
  @RequiresAccess('planning', 'edit')
  @Patch('items/:itemId')
  async updateItem(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateProjectChecklistItemDto,
  ): Promise<ProjectChecklistResponse> {
    return ProjectChecklistResponse.fromDomain(await this.updateItemUseCase.execute({
      projectId,
      itemId,
      text: dto.text,
      completed: dto.completed,
      position: dto.position,
    }));
  }

  @RequiresAccess('projects', 'edit')
  @RequiresAccess('planning', 'edit')
  @Delete('items/:itemId')
  @HttpCode(204)
  async removeItem(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.deleteItemUseCase.execute(projectId, itemId);
  }
}
