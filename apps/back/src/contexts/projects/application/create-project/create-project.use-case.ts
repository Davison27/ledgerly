import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../domain/project';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectCodeAlreadyExistsException } from '../../domain/errors/project-code-already-exists.exception';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../../shared/domain/id-generator.port';
import { CreateProjectCommand } from './create-project.command';

@Injectable()
export class CreateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateProjectCommand): Promise<Project> {
    const existing = await this.projectRepository.findByCode(command.code);

    if (existing !== null) {
      throw new ProjectCodeAlreadyExistsException(command.code);
    }

    const project = Project.create({
      id: this.idGenerator.generate(),
      name: command.name,
      code: command.code,
    });

    await this.projectRepository.save(project);

    return project;
  }
}
