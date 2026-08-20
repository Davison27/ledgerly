import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { PROJECT_EQUIPMENT_REPOSITORY, ProjectEquipmentRepository } from '../../domain/project-equipment.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';

@Injectable()
export class DeleteProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_EQUIPMENT_REPOSITORY)
    private readonly projectEquipmentRepository: ProjectEquipmentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const project = await this.projectRepository.findById(id);

    if (project === null) {
      throw new ProjectNotFoundException(id);
    }

    await this.projectEquipmentRepository.deleteByProjectId(id);
    await this.projectRepository.delete(id);
  }
}
