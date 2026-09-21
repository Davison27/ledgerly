import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import {
  PROJECT_DOCUMENT_COUNTER,
  ProjectDocumentCounter,
} from '../../domain/project-document-counter.port';

@Injectable()
export class DeleteProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_DOCUMENT_COUNTER)
    private readonly projectDocumentCounter: ProjectDocumentCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const project = await this.projectRepository.findById(id);

    if (project === null) {
      throw new ProjectNotFoundException(id);
    }

    const referenceCount = await this.projectDocumentCounter.count(id);

    if (referenceCount > 0) {
      await this.projectRepository.archive(id);
      return 'archived';
    }

    await this.projectRepository.delete(id);
    return 'deleted';
  }
}
