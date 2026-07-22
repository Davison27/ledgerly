import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentListFilters } from '../../domain/document-list-filters';
import {
  PROJECT_NAME_PROVIDER,
  ProjectNameProvider,
} from '../../domain/project-name-provider.port';
import { DocumentListItem } from './document-list-item';

@Injectable()
export class ListAllDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_NAME_PROVIDER) private readonly projectNameProvider: ProjectNameProvider,
  ) {}

  async execute(filters: DocumentListFilters): Promise<DocumentListItem[]> {
    const [rows, summaries] = await Promise.all([
      this.documentRepository.findAllForListing(filters),
      this.projectNameProvider.findAllNames(),
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
