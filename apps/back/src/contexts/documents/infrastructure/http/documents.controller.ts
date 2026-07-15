import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
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
    private readonly getDocumentFileUseCase: GetDocumentFileUseCase,
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_FILE_SIZE_BYTES },
    }),
  )
  async create(
    @Param('projectId') projectId: string,
    @Body('payload') payload: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DocumentResponse> {
    const dto = await this.parseCreateDocumentPayload(payload);

    if (file && (file.mimetype !== PDF_MIME_TYPE || !file.buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES))) {
      throw new BadRequestException('file must be a PDF');
    }

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
      file: file
        ? {
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          }
        : undefined,
    });

    return DocumentResponse.fromDomain(document);
  }

  private async parseCreateDocumentPayload(payload: string): Promise<CreateDocumentDto> {
    if (!payload) {
      throw new BadRequestException('payload is required');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      throw new BadRequestException('payload must be valid JSON');
    }

    const dto = plainToInstance(CreateDocumentDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
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

  @Get(':documentId/file')
  @Header('Content-Type', 'application/pdf')
  async getFile(@Param('documentId') documentId: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const file = await this.getDocumentFileUseCase.execute(documentId);

    if (!file) {
      throw new NotFoundException('Document file not found');
    }

    res.set({
      'Content-Disposition': `inline; filename="${file.fileName}"`,
    });

    return new StreamableFile(file.content);
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
