import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListInvoicesUseCase } from '../../application/list-invoices/list-invoices.use-case';
import { GetInvoiceUseCase } from '../../application/get-invoice/get-invoice.use-case';
import { CreateInvoiceUseCase } from '../../application/create-invoice/create-invoice.use-case';
import { GetInvoicePdfUseCase } from '../../application/get-invoice-pdf/get-invoice-pdf.use-case';
import { DeleteInvoiceUseCase } from '../../application/delete-invoice/delete-invoice.use-case';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { InvoiceResponse } from './invoice.response';
import { InvoiceListItemResponse } from './invoice-list-item.response';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

@RequiresAccess('invoices', 'view')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
    private readonly getInvoiceUseCase: GetInvoiceUseCase,
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoicePdfUseCase: GetInvoicePdfUseCase,
    private readonly deleteInvoiceUseCase: DeleteInvoiceUseCase,
  ) {}

  @Get()
  async list(): Promise<InvoiceListItemResponse[]> {
    const invoices = await this.listInvoicesUseCase.execute();

    return invoices.map((invoice) => InvoiceListItemResponse.fromItem(invoice));
  }

  @RequiresAccess('invoices', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateInvoiceDto): Promise<InvoiceResponse> {
    const invoice = await this.createInvoiceUseCase.execute({
      projectId: dto.projectId,
      issueDate: dto.issueDate ?? todayIso(),
      lines: dto.lines,
      taxRate: dto.taxRate,
      irpfRate: dto.irpfRate,
      customerName: dto.customerName,
      customerTaxId: dto.customerTaxId,
      customerAddress: dto.customerAddress,
      notes: dto.notes,
    });

    return InvoiceResponse.fromDomain(invoice);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<InvoiceResponse> {
    const invoice = await this.getInvoiceUseCase.execute(id);

    return InvoiceResponse.fromDomain(invoice);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async getPdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.getInvoicePdfUseCase.execute(id);

    res.set({
      'Content-Disposition': `inline; filename="${file.fileName}"`,
    });

    return new StreamableFile(file.content);
  }

  @RequiresAccess('invoices', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteInvoiceUseCase.execute(id);
  }
}
