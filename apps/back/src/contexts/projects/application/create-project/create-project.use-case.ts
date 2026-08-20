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
      type: command.type,
      status: command.status ?? 'active',
      description: command.description ?? null,
      clientCompany: command.clientCompany ?? null,
      clientTaxId: command.clientTaxId ?? null,
      contactName: command.contactName ?? null,
      contactEmail: command.contactEmail ?? null,
      contactPhone: command.contactPhone ?? null,
      address: command.address ?? null,
      startDate: command.startDate ?? null,
      endDate: command.endDate ?? null,
      budget: command.budget ?? null,
      currency: command.currency ?? 'EUR',
      fiscalYear: command.fiscalYear ?? null,
      manager: command.manager ?? null,
      image: command.image ?? null,
      color: command.color ?? null,
    });

    await this.projectRepository.save(project);

    return project;
  }
}
