import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { ListDocumentsQueryDto } from './dtos/list-documents.query.dto';
import { DocumentResponse } from './document.response';

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';
const PDF_MAGIC_BYTES = Buffer.from('%PDF-');

@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly getDocumentUseCase: GetDocumentUseCase,
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
    private readonly extractInvoiceUseCase: ExtractInvoiceUseCase,
  ) {}

  @Get()
  async list(
    @Param('projectId') projectId: string,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<DocumentResponse[]> {
    const documents = await this.listDocumentsUseCase.execute({
      projectId,
      filters: {
        search: query.search,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        amountMin: query.amountMin,
        amountMax: query.amountMax,
      },
    });

    return documents.map((document) => DocumentResponse.fromDomain(document));
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    const document = await this.createDocumentUseCase.execute({
      projectId,
      name: dto.name,
      type: dto.type,
      month: dto.month,
      date: dto.date,
      amount: dto.amount,
      status: dto.status,
      issuerName: dto.issuerName,
      issuerTaxId: dto.issuerTaxId,
      invoiceNumber: dto.invoiceNumber,
      dueDate: dto.dueDate,
      taxBase: dto.taxBase,
      taxRate: dto.taxRate,
      taxAmount: dto.taxAmount,
      currency: dto.currency,
    });

    return DocumentResponse.fromDomain(document);
  }

  @Post('extract')
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

    if (file.mimetype !== PDF_MIME_TYPE || !file.buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
      throw new BadRequestException('file must be a PDF');
    }

    return this.extractInvoiceUseCase.execute(file.buffer);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<DocumentResponse> {
    const document = await this.getDocumentUseCase.execute(id);

    return DocumentResponse.fromDomain(document);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteDocumentUseCase.execute(id);
  }
}
