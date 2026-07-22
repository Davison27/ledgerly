import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
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
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
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
        direction: query.direction,
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

    if (file && !isValidPdfFile(file)) {
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
      irpfRate: dto.irpfRate,
      irpfAmount: dto.irpfAmount,
      currency: dto.currency,
      supplierId: dto.supplierId,
      staffMemberId: dto.staffMemberId,
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

  // Best-effort, server-side learning: re-reads the just-uploaded PDF to
  // compare it against what the user actually submitted. Never allowed to
  // fail the document creation itself.
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
    } catch (error) {
      this.logger.warn(`Failed to record extraction feedback: ${(error as Error).message}`);
    }
  }

  // Best-effort, server-side quality tracking: records which extraction
  // strategy produced the fields shown for this PDF and how many the user
  // corrected, for `GET /api/extraction-quality`. Kept as its own try/catch
  // (separate from `recordExtractionFeedback`) so a failure in either
  // never affects the other, and neither can ever fail document creation.
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
    } catch (error) {
      this.logger.warn(`Failed to record extraction outcome: ${(error as Error).message}`);
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

    if (!isValidPdfFile(file)) {
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto): Promise<DocumentResponse> {
    const updated = await this.updateDocumentUseCase.execute({
      id,
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
      staffMemberId: dto.staffMemberId,
    });

    await this.recordEditFeedback(updated, dto);

    return DocumentResponse.fromDomain(updated);
  }

  // Best-effort re-feeding of the hints system after an edit (D6): a
  // correction made after upload is exactly the same (arguably better)
  // signal as one made during upload, and record-extraction-feedback is
  // idempotent by design. Guarded on two conditions to avoid needlessly
  // re-reading and re-parsing the PDF: the document must have a stored
  // file, and at least one LEARNABLE_FIELD must actually be present in the
  // incoming DTO — the majority edit this feature exists for (correcting
  // `direction`, which is not a LEARNABLE_FIELD) never touches the file at
  // all. Deliberately does NOT call RecordExtractionOutcomeUseCase: unlike
  // creation, an edit is not a fresh extraction event, and counting it as
  // one would artificially sink the measured heuristic quality every time
  // someone reclassifies a field the extractor doesn't even produce.
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
    } catch (error) {
      this.logger.warn(`Failed to record extraction feedback on edit: ${(error as Error).message}`);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteDocumentUseCase.execute(id);
  }
}
