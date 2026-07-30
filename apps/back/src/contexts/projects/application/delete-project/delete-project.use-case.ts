import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { PROJECT_PRODUCT_REPOSITORY, ProjectProductRepository } from '../../domain/project-product.repository';

@Injectable()
export class DeleteProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_PRODUCT_REPOSITORY)
    private readonly projectProductRepository: ProjectProductRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.projectProductRepository.deleteByProjectId(id);
    await this.projectRepository.delete(id);
  }
}
