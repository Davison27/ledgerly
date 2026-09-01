import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListStaffDocumentsUseCase } from '../../application/list-staff-documents/list-staff-documents.use-case';
import { UpdateStaffDocumentUseCase } from '../../application/update-staff-document/update-staff-document.use-case';
import { DeleteStaffDocumentUseCase } from '../../application/delete-staff-document/delete-staff-document.use-case';
import { GetStaffDocumentFileUseCase } from '../../application/get-staff-document-file/get-staff-document-file.use-case';
import { UpdateStaffDocumentDto } from './dtos/update-staff-document.dto';
import { ListStaffDocumentsQueryDto } from './dtos/list-staff-documents.query.dto';
import { StaffDocumentResponse } from './staff-document.response';

@RequiresAccess('staff', 'view')
@Controller('staff/:staffMemberId/documents')
export class StaffDocumentsController {
  constructor(
    private readonly listStaffDocumentsUseCase: ListStaffDocumentsUseCase,
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
