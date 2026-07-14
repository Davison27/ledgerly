import { Inject, Injectable } from '@nestjs/common';
import { ProjectSummary } from '../../domain/project-summary';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';

@Injectable()
export class ListProjectsUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  execute(): Promise<ProjectSummary[]> {
    return this.projectRepository.findAllSummaries();
  }
}
