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
import { UploadCapacityInterceptor } from '../../../../shared/infrastructure/http/upload-capacity.interceptor';
import { isValidPdfFile } from '../../../../shared/infrastructure/http/pdf-upload.validator';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';
import { CreateEquipmentDocumentUseCase } from '../../application/create-equipment-document/create-equipment-document.use-case';
import { DeleteEquipmentDocumentUseCase } from '../../application/delete-equipment-document/delete-equipment-document.use-case';
import { GetEquipmentDocumentFileUseCase } from '../../application/get-equipment-document-file/get-equipment-document-file.use-case';
import { ListEquipmentDocumentsUseCase } from '../../application/list-equipment-documents/list-equipment-documents.use-case';
import { UpdateEquipmentDocumentUseCase } from '../../application/update-equipment-document/update-equipment-document.use-case';
import { CreateEquipmentDocumentDto } from './dtos/create-equipment-document.dto';
import { UpdateEquipmentDocumentDto } from './dtos/update-equipment-document.dto';
import { EquipmentDocumentResponse } from './equipment-document.response';
import { MALWARE_SCANNER, MalwareScanner } from '../../../../shared/domain/malware-scanner.port';

export const EQUIPMENT_DOCUMENT_MULTIPART_LIMITS = {
  fileSize: STORED_FILE_PLAINTEXT_LIMITS.equipmentDocument,
  files: 1,
  fields: 1,
  parts: 3,
  fieldSize: 64 * 1024,
} as const;

@RequiresAccess('equipment', 'view')
@Controller('equipment/:equipmentId/documents')
export class EquipmentDocumentsController {
  constructor(
    private readonly listEquipmentDocumentsUseCase: ListEquipmentDocumentsUseCase,
    private readonly createEquipmentDocumentUseCase: CreateEquipmentDocumentUseCase,
    private readonly updateEquipmentDocumentUseCase: UpdateEquipmentDocumentUseCase,
    private readonly deleteEquipmentDocumentUseCase: DeleteEquipmentDocumentUseCase,
    private readonly getEquipmentDocumentFileUseCase: GetEquipmentDocumentFileUseCase,
    @Inject(MALWARE_SCANNER) private readonly malwareScanner: MalwareScanner,
  ) {}

  @Get()
  async list(@Param('equipmentId') equipmentId: string): Promise<EquipmentDocumentResponse[]> {
    const documents = await this.listEquipmentDocumentsUseCase.execute(equipmentId);

    return documents.map((document) => EquipmentDocumentResponse.fromDomain(document));
  }

  @RequiresAccess('equipment', 'edit')
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    UploadCapacityInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: EQUIPMENT_DOCUMENT_MULTIPART_LIMITS,
    }),
  )
  async create(
    @Param('equipmentId') equipmentId: string,
    @Body('payload') payload: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<EquipmentDocumentResponse> {
    const dto = await this.parseCreatePayload(payload);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (file.size > EQUIPMENT_DOCUMENT_MULTIPART_LIMITS.fileSize) {
      throw new BadRequestException('file is too large');
    }

    if (!isValidPdfFile(file)) {
      throw new BadRequestException('file must be a PDF');
    }

    await this.malwareScanner.scan(file.buffer);

    const document = await this.createEquipmentDocumentUseCase.execute({
      equipmentId,
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

    return EquipmentDocumentResponse.fromDomain(document);
  }

  @RequiresAccess('equipment', 'edit')
  @Patch(':documentId')
  async update(
    @Param('equipmentId') equipmentId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateEquipmentDocumentDto,
  ): Promise<EquipmentDocumentResponse> {
    const document = await this.updateEquipmentDocumentUseCase.execute({
      equipmentId,
      documentId,
      name: dto.name,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      notes: dto.notes,
    });

    return EquipmentDocumentResponse.fromDomain(document);
  }

  @Get(':documentId/file')
  async getFile(
    @Param('equipmentId') equipmentId: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.getEquipmentDocumentFileUseCase.execute(equipmentId, documentId);

    if (file === null) {
      throw new NotFoundException('Equipment document file not found');
    }

    response.set({
      'Content-Type': file.mimeType,
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });

    return new StreamableFile(file.content);
  }

  @RequiresAccess('equipment', 'edit')
  @Delete(':documentId')
  @HttpCode(204)
  async remove(
    @Param('equipmentId') equipmentId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    await this.deleteEquipmentDocumentUseCase.execute(equipmentId, documentId);
  }

  private async parseCreatePayload(payload: string): Promise<CreateEquipmentDocumentDto> {
    if (!payload) {
      throw new BadRequestException('payload is required');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      throw new BadRequestException('payload must be valid JSON');
    }

    const dto = plainToInstance(CreateEquipmentDocumentDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new BadRequestException('payload is invalid');
    }

    return dto;
  }
}
