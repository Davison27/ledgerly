import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../domain/project';
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

  async execute(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);

    if (project === null) {
      throw new ProjectNotFoundException(id);
    }

    return project;
  }
}
