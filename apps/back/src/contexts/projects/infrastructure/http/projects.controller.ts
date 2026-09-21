import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListProjectsUseCase } from '../../application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from '../../application/get-project/get-project.use-case';
import { CreateProjectUseCase } from '../../application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from '../../application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from '../../application/delete-project/delete-project.use-case';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectResponse } from './project.response';
import { ProjectSummaryResponse } from './project-summary.response';
import { DeletionOutcomeResponse } from '../../../../shared/infrastructure/http/deletion-outcome.response';
import { UnarchiveOutcomeResponse } from '../../../../shared/infrastructure/http/unarchive-outcome.response';
import { UnarchiveProjectUseCase } from '../../application/unarchive-project/unarchive-project.use-case';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@RequiresAccess('projects', 'view')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly listProjectsUseCase: ListProjectsUseCase,
    private readonly getProjectUseCase: GetProjectUseCase,
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly updateProjectUseCase: UpdateProjectUseCase,
    private readonly deleteProjectUseCase: DeleteProjectUseCase,
    private readonly unarchiveProjectUseCase: UnarchiveProjectUseCase,
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository,
  ) {}

  @Get()
  async list(): Promise<ProjectSummaryResponse[]> {
    const summaries = await this.listProjectsUseCase.execute();

    return summaries.map((summary) => ProjectSummaryResponse.fromSummary(summary));
  }

  @RequiresAccess('projects', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateProjectDto): Promise<ProjectResponse> {
    const project = await this.createProjectUseCase.execute({
      name: dto.name,
      code: dto.code,
      type: dto.type,
      status: dto.status,
      description: dto.description,
      clientId: dto.clientId,
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

    return ProjectResponse.fromDomain(project, await this.resolveClient(project.clientId));
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ProjectResponse> {
    const project = await this.getProjectUseCase.execute(id);

    return ProjectResponse.fromDomain(project, await this.resolveClient(project.clientId));
  }

  @RequiresAccess('projects', 'edit')
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
      clientId: dto.clientId,
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

    return ProjectResponse.fromDomain(project, await this.resolveClient(project.clientId));
  }

  @RequiresAccess('projects', 'edit')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<DeletionOutcomeResponse> {
    const outcome = await this.deleteProjectUseCase.execute(id);

    return new DeletionOutcomeResponse(outcome);
  }

  @RequiresAccess('projects', 'edit')
  @Post(':id/unarchive')
  async unarchive(@Param('id') id: string): Promise<UnarchiveOutcomeResponse> {
    await this.unarchiveProjectUseCase.execute(id);

    return new UnarchiveOutcomeResponse();
  }

  private resolveClient(clientId: string | null) {
    return clientId === null ? Promise.resolve(null) : this.clientRepository.findById(clientId);
  }
}
