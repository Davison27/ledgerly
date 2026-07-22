import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { ListAllDocumentsUseCase } from '../../application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from '../../application/check-document-duplicate/check-document-duplicate.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { ListAllDocumentsQueryDto } from './dtos/list-all-documents.query.dto';
import { DuplicateCheckQueryDto } from './dtos/duplicate-check.query.dto';
import { DocumentListItemResponse } from './document-list-item.response';
import { DocumentDuplicateCheckResponse } from './document-duplicate.response';
import { isValidPdfFile, MAX_PDF_FILE_SIZE_BYTES } from './pdf-file.validator';

@Controller('documents')
export class DocumentsGlobalController {
  constructor(
    private readonly listAllDocumentsUseCase: ListAllDocumentsUseCase,
    private readonly checkDocumentDuplicateUseCase: CheckDocumentDuplicateUseCase,
    private readonly extractInvoiceUseCase: ExtractInvoiceUseCase,
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
      direction: query.direction,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      amountMin: query.amountMin,
      amountMax: query.amountMax,
      projectId: query.projectId,
      supplierId: query.supplierId,
      staffMemberId: query.staffMemberId,
    });

    return documents.map((document) => DocumentListItemResponse.fromResult(document));
  }

  // Alias of `POST /projects/:projectId/documents/extract` that ignores
  // `projectId` anyway (documents.controller.ts): needed because uploading a
  // payroll from the staff member side has no project chosen yet, and the
  // project-scoped route requires one the use case never even reads.
  @Post('extract')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_FILE_SIZE_BYTES },
    }),
  )
  async extract(@UploadedFile() file?: Express.Multer.File): Promise<ExtractedInvoiceResult> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!isValidPdfFile(file)) {
      throw new BadRequestException('file must be a PDF');
    }

    return this.extractInvoiceUseCase.execute(file.buffer);
  }
}
