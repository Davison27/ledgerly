import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InvoicesController } from './invoices.controller';
import { ListInvoicesUseCase } from '../../application/list-invoices/list-invoices.use-case';
import { GetInvoiceUseCase } from '../../application/get-invoice/get-invoice.use-case';
import { CreateInvoiceUseCase } from '../../application/create-invoice/create-invoice.use-case';
import { GetInvoicePdfUseCase } from '../../application/get-invoice-pdf/get-invoice-pdf.use-case';
import { DeleteInvoiceUseCase } from '../../application/delete-invoice/delete-invoice.use-case';
import { CreateInvoiceCommand } from '../../application/create-invoice/create-invoice.command';
import { Invoice } from '../../domain/invoice';
import { InvoiceListItem } from '../../application/list-invoices/invoice-list-item';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';
import { InvoiceProjectNotFoundException } from '../../domain/errors/invoice-project-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildInvoice(overrides: Partial<CreateInvoiceCommand> & { id?: string } = {}): Invoice {
  return Invoice.create({
    id: overrides.id ?? 'invoice-1',
    series: 'F',
    year: 2026,
    number: 0,
    issueDate: overrides.issueDate ?? '2026-06-01',
    projectId: overrides.projectId ?? 'project-1',
    customerName: overrides.customerName ?? 'Cliente SL',
    customerTaxId: overrides.customerTaxId ?? null,
    customerAddress: overrides.customerAddress ?? null,
    lines: overrides.lines ?? [{ description: 'Consultoría', unitPrice: 100, quantity: 1 }],
    taxRate: overrides.taxRate,
    irpfRate: overrides.irpfRate,
    notes: overrides.notes ?? null,
  }).withNumber('F', 2026, 1);
}

describe('InvoicesController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let getExecute: jest.Mock;
  let createExecute: jest.Mock<Promise<Invoice>, [CreateInvoiceCommand]>;
  let getPdfExecute: jest.Mock;
  let deleteExecute: jest.Mock<Promise<void>, [string]>;

  beforeAll(async () => {
    listExecute = jest.fn((): Promise<InvoiceListItem[]> =>
      Promise.resolve([{ invoice: buildInvoice(), paymentStatus: 'pendiente' }]),
    );
    getExecute = jest.fn((id: string) => Promise.resolve(buildInvoice({ id })));
    createExecute = jest.fn((command: CreateInvoiceCommand) => Promise.resolve(buildInvoice(command)));
    getPdfExecute = jest.fn();
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: ListInvoicesUseCase, useValue: { execute: listExecute } },
        { provide: GetInvoiceUseCase, useValue: { execute: getExecute } },
        { provide: CreateInvoiceUseCase, useValue: { execute: createExecute } },
        { provide: GetInvoicePdfUseCase, useValue: { execute: getPdfExecute } },
        { provide: DeleteInvoiceUseCase, useValue: { execute: deleteExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    listExecute.mockClear();
    getExecute.mockClear();
    createExecute.mockClear();
    getPdfExecute.mockClear();
    deleteExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /invoices', () => {
    it('returns the invoice list as plain DTOs', async () => {
      const response = await request(httpServer).get('/invoices');

      expect(response.status).toBe(200);
      expect(listExecute).toHaveBeenCalledTimes(1);
      const body = response.body as { fullNumber: string; hasPdf: boolean }[];
      expect(body[0].fullNumber).toBe('F-2026-0001');
      expect(body[0].hasPdf).toBe(false);
      expect(body[0]).toHaveProperty('paymentStatus', 'pendiente');
    });
  });

  describe('POST /invoices', () => {
    const VALID_PAYLOAD = {
      projectId: '11111111-1111-4111-8111-111111111111',
      lines: [{ description: 'Consultoría', unitPrice: 100, quantity: 1 }],
      customerName: 'Cliente SL',
    };

    it('creates an invoice and returns 201', async () => {
      const response = await request(httpServer).post('/invoices').send(VALID_PAYLOAD);

      expect(response.status).toBe(201);
      expect(createExecute).toHaveBeenCalledTimes(1);
      const command = createExecute.mock.calls[0][0];
      expect(command.projectId).toBe(VALID_PAYLOAD.projectId);
      expect(command.customerName).toBe('Cliente SL');
      expect(typeof command.issueDate).toBe('string');
    });

    it('does not leak any project field in the response DTO shape', async () => {
      const response = await request(httpServer).post('/invoices').send(VALID_PAYLOAD);

      expect(response.status).toBe(201);
      expect(Object.keys(response.body as object)).not.toContain('project');
      expect(Object.keys(response.body as object)).not.toContain('projectName');
    });

    it('returns 400 when lines is empty', async () => {
      const response = await request(httpServer)
        .post('/invoices')
        .send({ ...VALID_PAYLOAD, lines: [] });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when customerName is missing', async () => {
      const payload: Record<string, unknown> = { ...VALID_PAYLOAD };
      delete payload.customerName;

      const response = await request(httpServer).post('/invoices').send(payload);

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when an extra field is sent (forbidNonWhitelisted)', async () => {
      const response = await request(httpServer)
        .post('/invoices')
        .send({ ...VALID_PAYLOAD, projectName: 'Should never be accepted' });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 404 when the project does not exist', async () => {
      createExecute.mockRejectedValueOnce(new InvoiceProjectNotFoundException(VALID_PAYLOAD.projectId));

      const response = await request(httpServer).post('/invoices').send(VALID_PAYLOAD);

      expect(response.status).toBe(404);
    });

    it('returns 400 when the company is missing name/taxId (D8)', async () => {
      createExecute.mockRejectedValueOnce(new InvalidValueException('company.taxId is required'));

      const response = await request(httpServer).post('/invoices').send(VALID_PAYLOAD);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /invoices/:id', () => {
    it('returns the invoice', async () => {
      const response = await request(httpServer).get('/invoices/invoice-1');

      expect(response.status).toBe(200);
      expect(getExecute).toHaveBeenCalledWith('invoice-1');
    });

    it('returns 404 when the invoice is not found', async () => {
      getExecute.mockRejectedValueOnce(new InvoiceNotFoundException('missing-id'));

      const response = await request(httpServer).get('/invoices/missing-id');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /invoices/:id/pdf', () => {
    it('streams the stored PDF bytes with the right headers', async () => {
      const pdf = Buffer.from('%PDF-fake');
      getPdfExecute.mockResolvedValueOnce({ content: pdf, fileName: 'factura-F-2026-0001.pdf' });

      const response = await request(httpServer).get('/invoices/invoice-1/pdf');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toBe(
        'inline; filename="factura-F-2026-0001.pdf"',
      );
      expect(Buffer.compare(response.body as Buffer, pdf)).toBe(0);
    });

    it('returns 404 when the invoice has no stored pdf', async () => {
      getPdfExecute.mockRejectedValueOnce(new InvoiceNotFoundException('invoice-1'));

      const response = await request(httpServer).get('/invoices/invoice-1/pdf');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /invoices/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/invoices/invoice-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('invoice-1');
    });
  });
});
