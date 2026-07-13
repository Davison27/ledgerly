import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { ListDocumentsQueryDto } from './dtos/list-documents.query.dto';
import { DocumentResponse } from './document.response';

@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly getDocumentUseCase: GetDocumentUseCase,
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
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

    return documents.map(DocumentResponse.fromDomain);
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
    });

    return DocumentResponse.fromDomain(document);
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
