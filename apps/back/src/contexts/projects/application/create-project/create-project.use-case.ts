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
import {
  PROJECT_CLIENT_LIFECYCLE_COORDINATOR,
  ProjectClientLifecycleCoordinator,
} from '../../domain/project-client-lifecycle-coordinator.port';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

@Injectable()
export class CreateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
    @Inject(PROJECT_CLIENT_LIFECYCLE_COORDINATOR)
    private readonly projectClientLifecycleCoordinator: ProjectClientLifecycleCoordinator,
  ) {}

  async execute(command: CreateProjectCommand): Promise<Project> {
    if (typeof command.clientId !== 'string' || command.clientId.length === 0) {
      throw new InvalidValueException('clientId is required');
    }

    const existing = await this.projectRepository.findByCode(command.code);

    if (existing !== null) {
      throw new ProjectCodeAlreadyExistsException(command.code);
    }

    const project = Project.create({
      id: this.idGenerator.generate(),
      name: command.name,
      code: command.code,
      type: command.type,
      status: command.status ?? 'active',
      description: command.description ?? null,
      clientId: command.clientId,
      address: command.address ?? null,
      startDate: command.startDate ?? null,
      endDate: command.endDate ?? null,
      budget: command.budget ?? null,
      currency: command.currency ?? 'EUR',
      manager: command.manager ?? null,
      image: command.image ?? null,
      color: command.color ?? null,
    });

    await this.projectClientLifecycleCoordinator.saveProjectForActiveClient(project);

    return project;
  }
}
