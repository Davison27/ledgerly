import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../domain/project';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { ProjectCodeAlreadyExistsException } from '../../domain/errors/project-code-already-exists.exception';
import { UpdateProjectCommand } from './update-project.command';

@Injectable()
export class UpdateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(command: UpdateProjectCommand): Promise<Project> {
    const project = await this.projectRepository.findById(command.id);

    if (project === null) {
      throw new ProjectNotFoundException(command.id);
    }

    if (command.code !== undefined && command.code !== project.code) {
      const existing = await this.projectRepository.findByCode(command.code);

      if (existing !== null) {
        throw new ProjectCodeAlreadyExistsException(command.code);
      }
    }

    if (command.name !== undefined) {
      project.rename(command.name);
    }

    if (command.code !== undefined) {
      project.changeCode(command.code);
    }

    await this.projectRepository.save(project);

    return project;
  }
}
