import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentListFilters } from '../../domain/document-list-filters';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../../projects/domain/project.repository';
import { DocumentListItem } from './document-list-item';

@Injectable()
export class ListAllDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(filters: DocumentListFilters): Promise<DocumentListItem[]> {
    const [rows, summaries] = await Promise.all([
      this.documentRepository.findAllForListing(filters),
      this.projectRepository.findAllSummaries(),
    ]);

    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      projectName: projectNameById.get(row.projectId) ?? '',
      name: row.name,
      type: row.type,
      status: row.status,
      direction: row.direction,
      date: row.date,
      dueDate: row.dueDate,
      amount: row.amount,
      currency: row.currency,
      issuerName: row.issuerName,
      invoiceNumber: row.invoiceNumber,
      supplierId: row.supplierId,
      staffMemberId: row.staffMemberId,
    }));
  }
}
