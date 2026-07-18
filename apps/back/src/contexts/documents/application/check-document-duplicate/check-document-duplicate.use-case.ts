import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../../projects/domain/project.repository';
import { normaliseTaxId } from '../../domain/extraction/tax-id';
import { normaliseIssuerName } from '../../domain/extraction/issuer-name';
import { CheckDocumentDuplicateQuery } from './check-document-duplicate.query';
import { DocumentDuplicateMatch } from './document-duplicate-match';

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
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(query: CheckDocumentDuplicateQuery): Promise<DocumentDuplicateMatch[]> {
    const candidates = await this.documentRepository.findPossibleDuplicates({
      issuerName: query.issuerName,
      issuerTaxId: query.issuerTaxId,
      invoiceNumber: query.invoiceNumber,
      amount: query.amount,
    });

    const issuerProvided = Boolean(query.issuerTaxId) || Boolean(query.issuerName);

    const matches = candidates.filter((candidate) => {
      if (!issuerProvided) {
        return true;
      }

      return taxIdMatches(query, candidate) || issuerNameMatches(query, candidate);
    });

    if (matches.length === 0) {
      return [];
    }

    const summaries = await this.projectRepository.findAllSummaries();
    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));

    return matches.map((match) => ({
      id: match.id,
      projectId: match.projectId,
      projectName: projectNameById.get(match.projectId) ?? '',
      name: match.name,
      date: match.date,
      amount: match.amount,
    }));
  }
}
