import { Inject, Injectable } from '@nestjs/common';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../projects/domain/project.repository';
import { ProjectNameProvider, ProjectNameSummary } from '../../domain/project-name-provider.port';

@Injectable()
export class ProjectRepositoryNameProvider implements ProjectNameProvider {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository) {}

  async findAllNames(): Promise<ProjectNameSummary[]> {
    const summaries = await this.projectRepository.findAllSummaries();

    return summaries.map((summary) => ({ id: summary.id, name: summary.name }));
  }
}
