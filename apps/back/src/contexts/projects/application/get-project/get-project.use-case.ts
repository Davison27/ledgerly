import { Inject, Injectable } from '@nestjs/common';
import { ProjectSummary } from '../../domain/project-summary';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';

@Injectable()
export class GetProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(id: string): Promise<ProjectSummary> {
    const summary = await this.projectRepository.findSummaryById(id);

    if (summary === null) {
      throw new ProjectNotFoundException(id);
    }

    return summary;
  }
}
