import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
import { ListProjectsQueryDto } from './dtos/list-projects.query.dto';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../domain/project.repository';
import { Project } from '../../domain/project';

interface ProjectListMemberAccess {
  canAccess(module: 'documents' | 'equipment' | 'planning', level: 'view' | 'edit'): boolean;
}

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
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
  ) {}

  @Get()
  async list(
    @CurrentMember() member: ProjectListMemberAccess,
    @Query() query: ListProjectsQueryDto = {},
  ): Promise<ProjectSummaryResponse[]> {
    const summaries = await this.listProjectsUseCase.execute(query.clientId);
    const includeDocumentAggregates = member.canAccess('documents', 'view');
    const includeFinancials = includeDocumentAggregates && member.canAccess('equipment', 'view');
    const includePlanningProgress = member.canAccess('planning', 'view');

    return summaries.map((summary) =>
      ProjectSummaryResponse.fromSummary(summary, includeDocumentAggregates, includeFinancials, includePlanningProgress),
    );
  }

  @RequiresAccess('projects', 'edit')
  @Post()
  @HttpCode(201)
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentMember() member: ProjectListMemberAccess,
  ): Promise<ProjectResponse> {
    if (dto.checklistTemplateId !== undefined && !member.canAccess('planning', 'edit')) {
      throw new ForbiddenException();
    }
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
      manager: dto.manager,
      image: dto.image,
      color: dto.color,
      checklistTemplateId: dto.checklistTemplateId,
    });

    return ProjectResponse.fromDomain(
      project,
      await this.resolveClient(project.clientId),
      await this.findPlanningSummary(project, member),
    );
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentMember() member: ProjectListMemberAccess,
  ): Promise<ProjectResponse> {
    const project = await this.getProjectUseCase.execute(id);

    return ProjectResponse.fromDomain(
      project,
      await this.resolveClient(project.clientId),
      await this.findProjectDetailSummary(project, member),
      true,
    );
  }

  @RequiresAccess('projects', 'edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentMember() member: ProjectListMemberAccess,
  ): Promise<ProjectResponse> {
    if ((dto.planningEnabled !== undefined || dto.checklistTemplateId !== undefined) &&
      !member.canAccess('planning', 'edit')) {
      throw new ForbiddenException();
    }
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
      manager: dto.manager,
      image: dto.image,
      color: dto.color,
      planningEnabled: dto.planningEnabled,
      checklistTemplateId: dto.checklistTemplateId,
    });

    return ProjectResponse.fromDomain(
      project,
      await this.resolveClient(project.clientId),
      await this.findPlanningSummary(project, member),
    );
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

  private resolveClient(clientId: string) {
    return this.clientRepository.findById(clientId);
  }

  private async findPlanningSummary(project: Project, member: ProjectListMemberAccess) {
    if (!project.planningEnabled || !member.canAccess('planning', 'view')) return null;
    return this.projectRepository.findSummaryById(project.id);
  }

  private async findProjectDetailSummary(project: Project, member: ProjectListMemberAccess) {
    if (!member.canAccess('planning', 'view')) return null;
    return this.projectRepository.findSummaryById(project.id);
  }
}
