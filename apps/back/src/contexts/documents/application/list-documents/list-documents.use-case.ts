import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import {
  PROJECT_EXISTENCE_CHECKER,
  ProjectExistenceChecker,
} from '../../domain/project-existence-checker.port';
import { DocumentProjectNotFoundException } from '../../domain/errors/document-project-not-found.exception';
import { ListDocumentsQuery } from './list-documents.query';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepository,
    @Inject(PROJECT_EXISTENCE_CHECKER) private readonly projectExistenceChecker: ProjectExistenceChecker,
  ) {}

  async execute(query: ListDocumentsQuery): Promise<Document[]> {
    const projectExists = await this.projectExistenceChecker.exists(query.projectId);

    if (!projectExists) {
      throw new DocumentProjectNotFoundException(query.projectId);
    }

    return this.repository.findByProject(query.projectId, query.filters);
  }
}
