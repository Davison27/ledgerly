import { Injectable } from '@nestjs/common';
import { CheckDocumentDuplicateUseCase } from '../../../documents/application/check-document-duplicate/check-document-duplicate.use-case';
import {
  DocumentDuplicateDetector,
  DuplicateDetectionCriteria,
} from '../../domain/document-duplicate-detector.port';

@Injectable()
export class CheckDuplicateDocumentDetector implements DocumentDuplicateDetector {
  constructor(private readonly checkDocumentDuplicateUseCase: CheckDocumentDuplicateUseCase) {}

  async hasDuplicates(criteria: DuplicateDetectionCriteria): Promise<boolean> {
    const matches = await this.checkDocumentDuplicateUseCase.execute({
      issuerName: criteria.issuerName,
      issuerTaxId: criteria.issuerTaxId,
      invoiceNumber: criteria.invoiceNumber,
      amount: criteria.amount,
    });

    return matches.some((match) => match.id !== criteria.documentId);
  }
}
