import { Controller, Get, Query } from '@nestjs/common';
import { ListAllDocumentsUseCase } from '../../application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from '../../application/check-document-duplicate/check-document-duplicate.use-case';
import { ListAllDocumentsQueryDto } from './dtos/list-all-documents.query.dto';
import { DuplicateCheckQueryDto } from './dtos/duplicate-check.query.dto';
import { DocumentListItemResponse } from './document-list-item.response';
import { DocumentDuplicateCheckResponse } from './document-duplicate.response';

@Controller('documents')
export class DocumentsGlobalController {
  constructor(
    private readonly listAllDocumentsUseCase: ListAllDocumentsUseCase,
    private readonly checkDocumentDuplicateUseCase: CheckDocumentDuplicateUseCase,
  ) {}

  @Get('duplicate-check')
  async duplicateCheck(
    @Query() query: DuplicateCheckQueryDto,
  ): Promise<DocumentDuplicateCheckResponse> {
    const matches = await this.checkDocumentDuplicateUseCase.execute({
      issuerName: query.issuerName,
      issuerTaxId: query.issuerTaxId,
      invoiceNumber: query.invoiceNumber,
      amount: query.amount,
    });

    return DocumentDuplicateCheckResponse.fromResults(matches);
  }

  @Get()
  async list(@Query() query: ListAllDocumentsQueryDto): Promise<DocumentListItemResponse[]> {
    const documents = await this.listAllDocumentsUseCase.execute({
      search: query.search,
      type: query.type,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      amountMin: query.amountMin,
      amountMax: query.amountMax,
      projectId: query.projectId,
      supplierId: query.supplierId,
    });

    return documents.map((document) => DocumentListItemResponse.fromResult(document));
  }
}
