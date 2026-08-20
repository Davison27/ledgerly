import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { ListStaffDocumentsUseCase } from '../../application/list-staff-documents/list-staff-documents.use-case';
import { CreateStaffDocumentUseCase } from '../../application/create-staff-document/create-staff-document.use-case';
import { UpdateStaffDocumentUseCase } from '../../application/update-staff-document/update-staff-document.use-case';
import { DeleteStaffDocumentUseCase } from '../../application/delete-staff-document/delete-staff-document.use-case';
import { GetStaffDocumentFileUseCase } from '../../application/get-staff-document-file/get-staff-document-file.use-case';
import { CreateStaffDocumentDto } from './dtos/create-staff-document.dto';
import { UpdateStaffDocumentDto } from './dtos/update-staff-document.dto';
import { ListStaffDocumentsQueryDto } from './dtos/list-staff-documents.query.dto';
import { StaffDocumentResponse } from './staff-document.response';
import {
  isValidStaffDocumentFile,
  MAX_STAFF_DOCUMENT_FILE_SIZE_BYTES,
  STAFF_DOCUMENT_MIME_TYPES,
} from './staff-document-file.validator';
import { UploadCapacityInterceptor } from '../../../../shared/infrastructure/http/upload-capacity.interceptor';

@RequiresAccess('staff', 'view')
@Controller('staff/:staffMemberId/documents')
export class StaffDocumentsController {
  constructor(
    private readonly listStaffDocumentsUseCase: ListStaffDocumentsUseCase,
    private readonly createStaffDocumentUseCase: CreateStaffDocumentUseCase,
    private readonly updateStaffDocumentUseCase: UpdateStaffDocumentUseCase,
    private readonly deleteStaffDocumentUseCase: DeleteStaffDocumentUseCase,
    private readonly getStaffDocumentFileUseCase: GetStaffDocumentFileUseCase,
  ) {}

  @Get()
  async list(
    @Param('staffMemberId') staffMemberId: string,
    @Query() query: ListStaffDocumentsQueryDto,
  ): Promise<StaffDocumentResponse[]> {
    const documents = await this.listStaffDocumentsUseCase.execute(staffMemberId, query.typeId);

    return documents.map((document) => StaffDocumentResponse.fromDomain(document));
  }

  @RequiresAccess('staff', 'edit')
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_STAFF_DOCUMENT_FILE_SIZE_BYTES, files: 1, fields: 1, parts: 3, fieldSize: 64 * 1024 },
    }),
  )
  async create(
    @Param('staffMemberId') staffMemberId: string,
    @Body('payload') payload: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<StaffDocumentResponse> {
    const dto = await this.parseCreateStaffDocumentPayload(payload);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!isValidStaffDocumentFile(file.mimetype, file.buffer)) {
      throw new BadRequestException(`file must be one of ${STAFF_DOCUMENT_MIME_TYPES.join(', ')}`);
    }

    const staffDocument = await this.createStaffDocumentUseCase.execute({
      staffMemberId,
      typeId: dto.typeId,
      name: dto.name ?? file.originalname,
      issueDate: dto.issueDate ?? new Date().toISOString().slice(0, 10),
      expiryDate: dto.expiryDate,
      notes: dto.notes,
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return StaffDocumentResponse.fromDomain(staffDocument);
  }

  private async parseCreateStaffDocumentPayload(payload: string): Promise<CreateStaffDocumentDto> {
    if (!payload) {
      throw new BadRequestException('payload is required');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      throw new BadRequestException('payload must be valid JSON');
    }

    const dto = plainToInstance(CreateStaffDocumentDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new BadRequestException('payload is invalid');
    }

    return dto;
  }

  @Get(':documentId/file')
  async getFile(
    @Param('staffMemberId') staffMemberId: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.getStaffDocumentFileUseCase.execute(documentId, staffMemberId);

    if (!file) {
      throw new NotFoundException('Staff document file not found');
    }

    res.set({
      'Content-Type': file.mimeType,
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });

    return new StreamableFile(file.content);
  }

  @RequiresAccess('staff', 'edit')
  @Patch(':documentId')
  async update(
    @Param('staffMemberId') staffMemberId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateStaffDocumentDto,
  ): Promise<StaffDocumentResponse> {
    const updated = await this.updateStaffDocumentUseCase.execute({
      id: documentId,
      staffMemberId,
      name: dto.name,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      notes: dto.notes,
    });

    return StaffDocumentResponse.fromDomain(updated);
  }

  @RequiresAccess('staff', 'edit')
  @Delete(':documentId')
  @HttpCode(204)
  async remove(
    @Param('staffMemberId') staffMemberId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    await this.deleteStaffDocumentUseCase.execute(documentId, staffMemberId);
  }
}
