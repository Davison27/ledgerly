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
import { ListProjectsUseCase } from '../../application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from '../../application/get-project/get-project.use-case';
import { CreateProjectUseCase } from '../../application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from '../../application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from '../../application/delete-project/delete-project.use-case';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectResponse } from './project.response';
import { ProjectSummaryResponse } from './project-summary.response';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly listProjectsUseCase: ListProjectsUseCase,
    private readonly getProjectUseCase: GetProjectUseCase,
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly updateProjectUseCase: UpdateProjectUseCase,
    private readonly deleteProjectUseCase: DeleteProjectUseCase,
  ) {}

  @Get()
  async list(): Promise<ProjectSummaryResponse[]> {
    const summaries = await this.listProjectsUseCase.execute();

    return summaries.map((summary) => ProjectSummaryResponse.fromSummary(summary));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateProjectDto): Promise<ProjectResponse> {
    const project = await this.createProjectUseCase.execute({
      name: dto.name,
      code: dto.code,
      type: dto.type,
      status: dto.status,
      description: dto.description,
      clientCompany: dto.clientCompany,
      clientTaxId: dto.clientTaxId,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      currency: dto.currency,
      fiscalYear: dto.fiscalYear,
      manager: dto.manager,
      image: dto.image,
      color: dto.color,
    });

    return ProjectResponse.fromDomain(project);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ProjectResponse> {
    const project = await this.getProjectUseCase.execute(id);

    return ProjectResponse.fromDomain(project);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.updateProjectUseCase.execute({
      id,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      status: dto.status,
      description: dto.description,
      clientCompany: dto.clientCompany,
      clientTaxId: dto.clientTaxId,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      currency: dto.currency,
      fiscalYear: dto.fiscalYear,
      manager: dto.manager,
      image: dto.image,
      color: dto.color,
    });

    return ProjectResponse.fromDomain(project);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteProjectUseCase.execute(id);
  }
}
