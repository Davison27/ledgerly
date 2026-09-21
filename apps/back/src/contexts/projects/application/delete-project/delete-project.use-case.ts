import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import {
  PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER,
  PhysicalDocumentReferenceCounter,
} from '../../domain/physical-document-reference-counter.port';

@Injectable()
export class DeleteProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER)
    private readonly projectPhysicalDocumentReferenceCounter: PhysicalDocumentReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const project = await this.projectRepository.findById(id);

    if (project === null) {
      throw new ProjectNotFoundException(id);
    }

    const referenceCount = await this.projectPhysicalDocumentReferenceCounter.countPhysicalDocumentReferences(id);

    if (referenceCount > 0) {
      await this.projectRepository.archive(id);
      return 'archived';
    }

    await this.projectRepository.delete(id);
    return 'deleted';
  }
}
