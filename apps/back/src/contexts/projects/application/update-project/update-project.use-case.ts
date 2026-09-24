import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../domain/project';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { ProjectCodeAlreadyExistsException } from '../../domain/errors/project-code-already-exists.exception';
import { UpdateProjectCommand } from './update-project.command';
import {
  PROJECT_CLIENT_LIFECYCLE_COORDINATOR,
  ProjectClientLifecycleCoordinator,
} from '../../domain/project-client-lifecycle-coordinator.port';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

@Injectable()
export class UpdateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_CLIENT_LIFECYCLE_COORDINATOR)
    private readonly projectClientLifecycleCoordinator: ProjectClientLifecycleCoordinator,
  ) {}

  async execute(command: UpdateProjectCommand): Promise<Project> {
    const project = await this.projectRepository.findById(command.id);

    if (project === null) {
      throw new ProjectNotFoundException(command.id);
    }

    if (command.clientId === null) {
      throw new InvalidValueException('clientId cannot be null');
    }

    const parentChanged = command.clientId !== undefined && command.clientId !== project.clientId;
    const planningChanged = command.planningEnabled !== undefined || command.checklistTemplateId !== undefined;

    if (command.checklistTemplateId !== undefined && command.planningEnabled !== true) {
      throw new InvalidValueException('A checklist template can only be assigned when planning is enabled');
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

    if (command.type !== undefined) {
      project.changeType(command.type);
    }

    if (command.status !== undefined) {
      project.changeStatus(command.status);
    }

    if (command.description !== undefined) {
      project.changeDescription(command.description);
    }

    if (command.clientId !== undefined) {
      project.changeClientId(command.clientId);
    }

    if (command.address !== undefined) {
      project.changeAddress(command.address);
    }

    if (command.startDate !== undefined) {
      project.changeStartDate(command.startDate);
    }

    if (command.endDate !== undefined) {
      project.changeEndDate(command.endDate);
    }

    if (command.budget !== undefined) {
      project.changeBudget(command.budget);
    }

    if (command.currency !== undefined) {
      project.changeCurrency(command.currency);
    }

    if (command.manager !== undefined) {
      project.changeManager(command.manager);
    }

    if (command.image !== undefined) {
      project.changeImage(command.image);
    }

    if (command.color !== undefined) {
      project.changeColor(command.color);
    }

    if (command.planningEnabled !== undefined) {
      project.changePlanningEnabled(command.planningEnabled);
    }

    if (parentChanged || planningChanged) {
      await this.projectClientLifecycleCoordinator.saveProjectForActiveClient(project, command.checklistTemplateId);
    } else {
      await this.projectRepository.save(project);
    }

    return project;
  }
}
