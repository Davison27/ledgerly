import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
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
import { UploadCapacityInterceptor } from '../../../../shared/infrastructure/http/upload-capacity.interceptor';
import { isValidPdfFile, MAX_PDF_UPLOAD_SIZE_BYTES } from '../../../../shared/infrastructure/http/pdf-upload.validator';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { CreateCompanyDocumentUseCase } from '../../application/create-company-document/create-company-document.use-case';
import { DeleteCompanyDocumentUseCase } from '../../application/delete-company-document/delete-company-document.use-case';
import { GetCompanyDocumentFileUseCase } from '../../application/get-company-document-file/get-company-document-file.use-case';
import { ListCompanyDocumentsUseCase } from '../../application/list-company-documents/list-company-documents.use-case';
import { UpdateCompanyDocumentUseCase } from '../../application/update-company-document/update-company-document.use-case';
import { CreateCompanyDocumentDto } from './dtos/create-company-document.dto';
import { ListCompanyDocumentsQueryDto } from './dtos/list-company-documents.query.dto';
import { UpdateCompanyDocumentDto } from './dtos/update-company-document.dto';
import { CompanyDocumentResponse } from './company-document.response';
import { MALWARE_SCANNER, MalwareScanner } from '../../../../shared/domain/malware-scanner.port';

export const COMPANY_DOCUMENT_MULTIPART_LIMITS = {
  fileSize: MAX_PDF_UPLOAD_SIZE_BYTES,
  files: 1,
  fields: 1,
  parts: 3,
  fieldSize: 64 * 1024,
} as const;

@RequiresAdmin()
@Controller('company/documents')
export class CompanyDocumentsController {
  constructor(
    private readonly listCompanyDocumentsUseCase: ListCompanyDocumentsUseCase,
    private readonly createCompanyDocumentUseCase: CreateCompanyDocumentUseCase,
    private readonly updateCompanyDocumentUseCase: UpdateCompanyDocumentUseCase,
    private readonly deleteCompanyDocumentUseCase: DeleteCompanyDocumentUseCase,
    private readonly getCompanyDocumentFileUseCase: GetCompanyDocumentFileUseCase,
    @Inject(MALWARE_SCANNER) private readonly malwareScanner: MalwareScanner,
  ) {}

  @Get()
  async list(@Query() query: ListCompanyDocumentsQueryDto): Promise<CompanyDocumentResponse[]> {
    const documents = await this.listCompanyDocumentsUseCase.execute(query.typeId);

    return documents.map((document) => CompanyDocumentResponse.fromDomain(document));
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: COMPANY_DOCUMENT_MULTIPART_LIMITS,
    }),
  )
  async create(
    @Body('payload') payload: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CompanyDocumentResponse> {
    const dto = await this.parseCreatePayload(payload);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!isValidPdfFile(file)) {
      throw new BadRequestException('file must be a PDF');
    }

    await this.malwareScanner.scan(file.buffer);

    const document = await this.createCompanyDocumentUseCase.execute({
      typeId: dto.typeId,
      name: dto.name ?? file.originalname,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      notes: dto.notes,
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return CompanyDocumentResponse.fromDomain(document);
  }

  @Patch(':documentId')
  async update(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateCompanyDocumentDto,
  ): Promise<CompanyDocumentResponse> {
    const document = await this.updateCompanyDocumentUseCase.execute({
      id: documentId,
      name: dto.name,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      notes: dto.notes,
    });

    return CompanyDocumentResponse.fromDomain(document);
  }

  @Get(':documentId/file')
  async getFile(
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.getCompanyDocumentFileUseCase.execute(documentId);

    if (file === null) {
      throw new NotFoundException('Company document file not found');
    }

    response.set({
      'Content-Type': file.mimeType,
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });

    return new StreamableFile(file.content);
  }

  @Delete(':documentId')
  @HttpCode(204)
  async remove(@Param('documentId') documentId: string): Promise<void> {
    await this.deleteCompanyDocumentUseCase.execute(documentId);
  }

  private async parseCreatePayload(payload: string): Promise<CreateCompanyDocumentDto> {
    if (!payload) {
      throw new BadRequestException('payload is required');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      throw new BadRequestException('payload must be valid JSON');
    }

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new BadRequestException('payload is invalid');
    }

    const dto = plainToInstance(CreateCompanyDocumentDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new BadRequestException('payload is invalid');
    }

    return dto;
  }
}
