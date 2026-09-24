import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { CreateChecklistTemplateUseCase } from '../../application/create-checklist-template/create-checklist-template.use-case';
import { DeleteChecklistTemplateUseCase } from '../../application/delete-checklist-template/delete-checklist-template.use-case';
import { GetChecklistTemplateUseCase } from '../../application/get-checklist-template/get-checklist-template.use-case';
import { ListChecklistTemplatesUseCase } from '../../application/list-checklist-templates/list-checklist-templates.use-case';
import { UpdateChecklistTemplateUseCase } from '../../application/update-checklist-template/update-checklist-template.use-case';
import { CreateChecklistTemplateDto } from './dtos/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dtos/update-checklist-template.dto';
import { ProjectChecklistTemplateResponse } from './project-checklist-template.response';

@RequiresAccess('planning', 'view')
@Controller('project-checklist-templates')
export class ProjectChecklistTemplatesController {
  constructor(
    private readonly listTemplatesUseCase: ListChecklistTemplatesUseCase,
    private readonly getTemplateUseCase: GetChecklistTemplateUseCase,
    private readonly createTemplateUseCase: CreateChecklistTemplateUseCase,
    private readonly updateTemplateUseCase: UpdateChecklistTemplateUseCase,
    private readonly deleteTemplateUseCase: DeleteChecklistTemplateUseCase,
  ) {}

  @Get()
  async list(): Promise<ProjectChecklistTemplateResponse[]> {
    return (await this.listTemplatesUseCase.execute()).map((template) =>
      ProjectChecklistTemplateResponse.fromDomain(template),
    );
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ProjectChecklistTemplateResponse> {
    return ProjectChecklistTemplateResponse.fromDomain(await this.getTemplateUseCase.execute(id));
  }

  @RequiresAccess('planning', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateChecklistTemplateDto): Promise<ProjectChecklistTemplateResponse> {
    return ProjectChecklistTemplateResponse.fromDomain(await this.createTemplateUseCase.execute({
      name: dto.name,
      items: dto.items ?? [],
    }));
  }

  @RequiresAccess('planning', 'edit')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ): Promise<ProjectChecklistTemplateResponse> {
    return ProjectChecklistTemplateResponse.fromDomain(await this.updateTemplateUseCase.execute({
      id,
      name: dto.name,
      items: dto.items,
    }));
  }

  @RequiresAccess('planning', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteTemplateUseCase.execute(id);
  }
}
