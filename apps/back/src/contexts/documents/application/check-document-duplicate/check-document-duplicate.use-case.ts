import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import {
  PROJECT_NAME_PROVIDER,
  ProjectNameProvider,
} from '../../domain/project-name-provider.port';
import { normaliseTaxId } from '../../domain/extraction/tax-id';
import { normaliseIssuerName } from '../../domain/extraction/issuer-name';
import { CheckDocumentDuplicateQuery } from './check-document-duplicate.query';
import { DocumentDuplicateMatch } from './document-duplicate-match';
import { Page, PageRequest } from '../../../../shared/domain/pagination';

function taxIdMatches(query: CheckDocumentDuplicateQuery, candidate: DocumentDuplicateRow): boolean {
  if (!query.issuerTaxId || !candidate.issuerTaxId) {
    return false;
  }

  return normaliseTaxId(query.issuerTaxId) === normaliseTaxId(candidate.issuerTaxId);
}

function issuerNameMatches(
  query: CheckDocumentDuplicateQuery,
  candidate: DocumentDuplicateRow,
): boolean {
  if (!query.issuerName || !candidate.issuerName) {
    return false;
  }

  return normaliseIssuerName(query.issuerName) === normaliseIssuerName(candidate.issuerName);
}

@Injectable()
export class CheckDocumentDuplicateUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_NAME_PROVIDER) private readonly projectNameProvider: ProjectNameProvider,
  ) {}

  async execute(query: CheckDocumentDuplicateQuery): Promise<DocumentDuplicateMatch[]> {
    const candidates = await this.documentRepository.findPossibleDuplicates({
      issuerName: query.issuerName,
      issuerTaxId: query.issuerTaxId,
      invoiceNumber: query.invoiceNumber,
      amount: query.amount,
    });

    const matches = this.filterCandidates(query, candidates);

    if (matches.length === 0) {
      return [];
    }

    const summaries = await this.projectNameProvider.findAllNames();
    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));

    return matches.map((match) => this.toMatch(match, projectNameById));
  }

  async executePage(
    query: CheckDocumentDuplicateQuery,
    request: PageRequest,
  ): Promise<Page<DocumentDuplicateMatch>> {
    if (!this.documentRepository.findPagePossibleDuplicates) {
      const matches = await this.execute(query);
      const start = (request.page - 1) * request.size;
      return {
        items: matches.slice(start, start + request.size),
        total: matches.length,
        page: request.page,
        size: request.size,
      };
    }

    const page = await this.documentRepository.findPagePossibleDuplicates(
      {
        issuerName: query.issuerName,
        issuerTaxId: query.issuerTaxId,
        invoiceNumber: query.invoiceNumber,
        amount: query.amount,
      },
      request,
    );
    const matches = this.filterCandidates(query, page.items);
    const projectIds = [...new Set(matches.map((match) => match.projectId))];
    const summaries = this.projectNameProvider.findNamesByIds
      ? await this.projectNameProvider.findNamesByIds(projectIds)
      : await this.projectNameProvider.findAllNames();
    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));

    return {
      ...page,
      total: page.total,
      items: matches.map((match) => this.toMatch(match, projectNameById)),
    };
  }

  private filterCandidates(
    query: CheckDocumentDuplicateQuery,
    candidates: DocumentDuplicateRow[],
  ): DocumentDuplicateRow[] {
    const issuerProvided = Boolean(query.issuerTaxId) || Boolean(query.issuerName);

    return candidates.filter((candidate) => {
      if (!issuerProvided) {
        return true;
      }

      return taxIdMatches(query, candidate) || issuerNameMatches(query, candidate);
    });
  }

  private toMatch(
    match: DocumentDuplicateRow,
    projectNameById: Map<string, string>,
  ): DocumentDuplicateMatch {
    return {
      id: match.id,
      projectId: match.projectId,
      projectName: projectNameById.get(match.projectId) ?? '',
      name: match.name,
      date: match.date,
      amount: match.amount,
    };
  }
}
