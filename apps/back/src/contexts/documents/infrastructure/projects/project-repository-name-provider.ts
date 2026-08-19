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

  async findNamesByIds(ids: string[]): Promise<ProjectNameSummary[]> {
    if (ids.length === 0) {
      return [];
    }

    if (this.projectRepository.findNamesByIds) {
      return this.projectRepository.findNamesByIds(ids);
    }

    const summaries = await this.findAllNames();
    const idsSet = new Set(ids);

    return summaries.filter((summary) => idsSet.has(summary.id));
  }
}
