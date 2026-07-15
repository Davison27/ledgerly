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

    if (command.type !== undefined) {
      project.changeType(command.type);
    }

    if (command.status !== undefined) {
      project.changeStatus(command.status);
    }

    if (command.description !== undefined) {
      project.changeDescription(command.description);
    }

    if (command.clientCompany !== undefined) {
      project.changeClientCompany(command.clientCompany);
    }

    if (command.clientTaxId !== undefined) {
      project.changeClientTaxId(command.clientTaxId);
    }

    if (command.contactName !== undefined) {
      project.changeContactName(command.contactName);
    }

    if (command.contactEmail !== undefined) {
      project.changeContactEmail(command.contactEmail);
    }

    if (command.contactPhone !== undefined) {
      project.changeContactPhone(command.contactPhone);
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

    if (command.fiscalYear !== undefined) {
      project.changeFiscalYear(command.fiscalYear);
    }

    if (command.manager !== undefined) {
      project.changeManager(command.manager);
    }

    await this.projectRepository.save(project);

    return project;
  }
}
