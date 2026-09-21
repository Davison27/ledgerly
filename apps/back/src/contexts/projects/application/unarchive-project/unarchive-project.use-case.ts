import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';

@Injectable()
export class UnarchiveProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const project = await this.projectRepository.findById(id);

    if (project === null) {
      throw new ProjectNotFoundException(id);
    }

    if (this.projectRepository.unarchive === undefined) {
      throw new Error('Project repository does not support unarchiving');
    }

    await this.projectRepository.unarchive(id);
  }
}
