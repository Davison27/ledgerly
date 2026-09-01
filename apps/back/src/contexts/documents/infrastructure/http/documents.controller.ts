import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { UpdateDocumentUseCase } from '../../application/update-document/update-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from '../../application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionOutcomeUseCase } from '../../application/record-extraction-outcome/record-extraction-outcome.use-case';
import { Document } from '../../domain/document';
import { LEARNABLE_FIELDS } from '../../domain/extraction/hints/invoice-hint';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { UpdateDocumentDto } from './dtos/update-document.dto';
import { ListDocumentsQueryDto } from './dtos/list-documents.query.dto';
import { DocumentResponse } from './document.response';
import { isValidPdfFile, MAX_PDF_FILE_SIZE_BYTES } from './pdf-file.validator';
import { UploadCapacityInterceptor } from '../../../../shared/infrastructure/http/upload-capacity.interceptor';
import { getOptionalPageRequest } from '../../../../shared/infrastructure/http/dtos/page.query.dto';
import { DocumentPageResponse } from './document-page.response';
import { MALWARE_SCANNER, MalwareScanner } from '../../../../shared/domain/malware-scanner.port';

@RequiresAccess('documents', 'view')
@Controller('projects/:projectId/documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly getDocumentUseCase: GetDocumentUseCase,
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly updateDocumentUseCase: UpdateDocumentUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
    private readonly extractInvoiceUseCase: ExtractInvoiceUseCase,
    private readonly getDocumentFileUseCase: GetDocumentFileUseCase,
    private readonly recordExtractionFeedbackUseCase: RecordExtractionFeedbackUseCase,
    private readonly recordExtractionOutcomeUseCase: RecordExtractionOutcomeUseCase,
    @Inject(MALWARE_SCANNER) private readonly malwareScanner: MalwareScanner,
  ) {}

  @Get()
  async list(
    @Param('projectId') projectId: string,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<DocumentResponse[] | DocumentPageResponse> {
    const listQuery = {
      projectId,
      filters: {
        search: query.search,
        type: query.type,
        status: query.status,
        direction: query.direction,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        amountMin: query.amountMin,
        amountMax: query.amountMax,
      },
    };
    const pageRequest = getOptionalPageRequest(query);

    if (pageRequest) {
      return DocumentPageResponse.fromPage(await this.listDocumentsUseCase.executePage(listQuery, pageRequest));
    }

    const documents = await this.listDocumentsUseCase.execute(listQuery);

    return documents.map((document) => DocumentResponse.fromDomain(document));
  }

  @RequiresAccess('documents', 'edit')
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_FILE_SIZE_BYTES, files: 1, fields: 1, parts: 3, fieldSize: 64 * 1024 },
    }),
  )
  async create(
    @Param('projectId') projectId: string,
    @Body('payload') payload: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DocumentResponse> {
    const dto = await this.parseCreateDocumentPayload(payload);

    if (file && !isValidPdfFile(file)) {
      throw new BadRequestException('file must be a PDF');
    }

    if (file) await this.malwareScanner.scan(file.buffer);

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
      irpfRate: dto.irpfRate,
      irpfAmount: dto.irpfAmount,
      currency: dto.currency,
      supplierId: dto.supplierId,
      direction: dto.direction,
      file: file
        ? {
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          }
        : undefined,
    });

    if (file) {
      await this.recordExtractionFeedback(file.buffer, dto);
      await this.recordExtractionOutcome(file.buffer, dto);
    }

    return DocumentResponse.fromDomain(document);
  }

  private async recordExtractionFeedback(fileBuffer: Buffer, dto: CreateDocumentDto): Promise<void> {
    try {
      await this.recordExtractionFeedbackUseCase.execute({
        fileBuffer,
        submitted: {
          issuerName: dto.issuerName,
          issuerTaxId: dto.issuerTaxId,
          invoiceNumber: dto.invoiceNumber,
          date: dto.date,
          dueDate: dto.dueDate,
          amount: dto.amount,
          taxBase: dto.taxBase,
          taxRate: dto.taxRate,
          taxAmount: dto.taxAmount,
        },
      });
    } catch {
      this.logger.warn('Could not record extraction feedback');
    }
  }

  private async recordExtractionOutcome(fileBuffer: Buffer, dto: CreateDocumentDto): Promise<void> {
    try {
      await this.recordExtractionOutcomeUseCase.execute({
        fileBuffer,
        submitted: {
          issuerName: dto.issuerName,
          issuerTaxId: dto.issuerTaxId,
          invoiceNumber: dto.invoiceNumber,
          date: dto.date,
          dueDate: dto.dueDate,
          amount: dto.amount,
          taxBase: dto.taxBase,
          taxRate: dto.taxRate,
          taxAmount: dto.taxAmount,
        },
      });
    } catch {
      this.logger.warn('Could not record extraction outcome');
    }
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
      throw new BadRequestException('payload is invalid');
    }

    return dto;
  }

  @RequiresAccess('documents', 'edit')
  @Post('extract')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
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

    await this.malwareScanner.scan(file.buffer);

    return this.extractInvoiceUseCase.execute({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      fileSize: file.size,
    });
  }

  @Get(':documentId/file')
  @Header('Content-Type', 'application/pdf')
  async getFile(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.getDocumentFileUseCase.execute(documentId, projectId);

    if (!file) {
      throw new NotFoundException('Document file not found');
    }

    res.set({
      'Cache-Control': 'no-store',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });

    return new StreamableFile(file.content);
  }

  @Get(':id')
  async get(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<DocumentResponse> {
    const document = await this.getDocumentUseCase.execute(id, projectId);

    return DocumentResponse.fromDomain(document);
  }

  @RequiresAccess('documents', 'edit')
  @Patch(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponse> {
    const updated = await this.updateDocumentUseCase.execute({
      id,
      projectId,
      name: dto.name,
      type: dto.type,
      direction: dto.direction,
      status: dto.status,
      date: dto.date,
      dueDate: dto.dueDate,
      amount: dto.amount,
      taxBase: dto.taxBase,
      taxRate: dto.taxRate,
      taxAmount: dto.taxAmount,
      irpfRate: dto.irpfRate,
      irpfAmount: dto.irpfAmount,
      currency: dto.currency,
      issuerName: dto.issuerName,
      issuerTaxId: dto.issuerTaxId,
      invoiceNumber: dto.invoiceNumber,
      supplierId: dto.supplierId,
    });

    await this.recordEditFeedback(updated, dto);

    return DocumentResponse.fromDomain(updated);
  }

  private async recordEditFeedback(updated: Document, dto: UpdateDocumentDto): Promise<void> {
    if (!updated.hasFile()) {
      return;
    }

    const touchedLearnableField = LEARNABLE_FIELDS.some((field) => dto[field] !== undefined);

    if (!touchedLearnableField) {
      return;
    }

    try {
      const file = await this.getDocumentFileUseCase.execute(updated.getId());

      if (!file) {
        return;
      }

      await this.recordExtractionFeedbackUseCase.execute({
        fileBuffer: file.content,
        submitted: {
          issuerName: updated.getIssuerName() ?? undefined,
          issuerTaxId: updated.getIssuerTaxId() ?? undefined,
          invoiceNumber: updated.getInvoiceNumber() ?? undefined,
          date: updated.getDate(),
          dueDate: updated.getDueDate() ?? undefined,
          amount: updated.getAmount(),
          taxBase: updated.getTaxBase() ?? undefined,
          taxRate: updated.getTaxRate() ?? undefined,
          taxAmount: updated.getTaxAmount() ?? undefined,
        },
      });
    } catch {
      this.logger.warn('Could not record extraction feedback after document update');
    }
  }

  @RequiresAccess('documents', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('projectId') projectId: string, @Param('id') id: string): Promise<void> {
    await this.deleteDocumentUseCase.execute(id, projectId);
  }
}
