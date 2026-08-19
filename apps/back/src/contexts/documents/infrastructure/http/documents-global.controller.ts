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
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListAllDocumentsUseCase } from '../../application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from '../../application/check-document-duplicate/check-document-duplicate.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { ListAllDocumentsQueryDto } from './dtos/list-all-documents.query.dto';
import { DuplicateCheckQueryDto } from './dtos/duplicate-check.query.dto';
import { DocumentListItemResponse } from './document-list-item.response';
import { DocumentDuplicateCheckResponse } from './document-duplicate.response';
import { isValidPdfFile, MAX_PDF_FILE_SIZE_BYTES } from './pdf-file.validator';
import { UploadCapacityInterceptor } from '../../../../shared/infrastructure/http/upload-capacity.interceptor';
import { getOptionalPageRequest } from '../../../../shared/infrastructure/http/dtos/page.query.dto';
import { DocumentListPageResponse } from './document-list-page.response';

@RequiresAccess('documents', 'view')
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
    const duplicateQuery = {
      issuerName: query.issuerName,
      issuerTaxId: query.issuerTaxId,
      invoiceNumber: query.invoiceNumber,
      amount: query.amount,
    };
    const pageRequest = getOptionalPageRequest(query);

    if (pageRequest) {
      return DocumentDuplicateCheckResponse.fromPage(
        await this.checkDocumentDuplicateUseCase.executePage(duplicateQuery, pageRequest),
      );
    }

    const matches = await this.checkDocumentDuplicateUseCase.execute(duplicateQuery);

    return DocumentDuplicateCheckResponse.fromResults(matches);
  }

  @Get()
  async list(
    @Query() query: ListAllDocumentsQueryDto,
  ): Promise<DocumentListItemResponse[] | DocumentListPageResponse> {
    const filters = {
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
    };
    const pageRequest = getOptionalPageRequest(query);

    if (pageRequest) {
      return DocumentListPageResponse.fromPage(
        await this.listAllDocumentsUseCase.executePage(filters, pageRequest),
      );
    }

    const documents = await this.listAllDocumentsUseCase.execute(filters);

    return documents.map((document) => DocumentListItemResponse.fromResult(document));
  }

  @RequiresAccess('documents', 'edit')
  @Post('extract')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_FILE_SIZE_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  async extract(@UploadedFile() file?: Express.Multer.File): Promise<ExtractedInvoiceResult> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!isValidPdfFile(file)) {
      throw new BadRequestException('file must be a PDF');
    }

    return this.extractInvoiceUseCase.execute({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      fileSize: file.size,
    });
  }
}
