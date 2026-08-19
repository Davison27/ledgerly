import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentListFilters } from '../../domain/document-list-filters';
import { DocumentListRow } from '../../domain/document-list-row';
import {
  PROJECT_NAME_PROVIDER,
  ProjectNameProvider,
} from '../../domain/project-name-provider.port';
import { DocumentListItem } from './document-list-item';
import { Page, PageRequest } from '../../../../shared/domain/pagination';

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

    return rows.map((row) => this.toListItem(row, projectNameById));
  }

  async executePage(
    filters: DocumentListFilters,
    request: PageRequest,
  ): Promise<Page<DocumentListItem>> {
    const page = this.documentRepository.findPageForListing
      ? await this.documentRepository.findPageForListing(filters, request)
      : await this.fallbackPage(filters, request);
    const projectIds = [...new Set(page.items.map((row) => row.projectId))];
    const summaries = this.projectNameProvider.findNamesByIds
      ? await this.projectNameProvider.findNamesByIds(projectIds)
      : await this.projectNameProvider.findAllNames();
    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));

    return {
      ...page,
      items: page.items.map((row) => this.toListItem(row, projectNameById)),
    };
  }

  private async fallbackPage(
    filters: DocumentListFilters,
    request: PageRequest,
  ): Promise<Page<DocumentListRow>> {
    const rows = await this.documentRepository.findAllForListing(filters);
    const start = (request.page - 1) * request.size;

    return {
      items: rows.slice(start, start + request.size),
      total: rows.length,
      page: request.page,
      size: request.size,
    };
  }

  private toListItem(
    row: DocumentListRow,
    projectNameById: Map<string, string>,
  ): DocumentListItem {
    return {
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
    };
  }
}
