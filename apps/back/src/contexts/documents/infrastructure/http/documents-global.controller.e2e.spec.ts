import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DocumentsGlobalController } from './documents-global.controller';
import { ListAllDocumentsUseCase } from '../../application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from '../../application/check-document-duplicate/check-document-duplicate.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractInvoiceCommand } from '../../application/extract-invoice/extract-invoice.command';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { DocumentListItem } from '../../application/list-all-documents/document-list-item';
import { DocumentDuplicateMatch } from '../../application/check-document-duplicate/document-duplicate-match';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { MALWARE_SCANNER } from '../../../../shared/domain/malware-scanner.port';
import { MalwareDetectedException } from '../../../../shared/domain/errors/malware-detected.exception';
import { MalwareScannerUnavailableException } from '../../../../shared/domain/errors/malware-scanner-unavailable.exception';
import { PDF_READER, PdfReadResult } from '../../domain/extraction/pdf-reader.port';
import { INVOICE_HINT_REPOSITORY } from '../../domain/extraction/hints/invoice-hint.repository';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../shared/domain/domain-event-publisher.port';

const PDF_HEADER = Buffer.from('%PDF-1.4\n%mock');
const PDF_READ_RESULT: PdfReadResult = { text: 'invoice', attachments: [] };

function buildListItem(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    projectName: 'Project One',
    name: 'Invoice 1',
    type: 'factura',
    status: 'pendiente',
    direction: 'gasto',
    date: '2026-06-15',
    dueDate: null,
    amount: 100,
    currency: 'EUR',
    issuerName: 'Acme SL',
    invoiceNumber: 'INV-1',
    supplierId: null,
    staffMemberId: null,
    ...overrides,
  };
}

function buildMatch(overrides: Partial<DocumentDuplicateMatch> = {}): DocumentDuplicateMatch {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    projectName: 'Project One',
    name: 'Invoice 1',
    date: '2026-06-15',
    amount: 100,
    ...overrides,
  };
}

describe('DocumentsGlobalController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let duplicateCheckExecute: jest.Mock;
  let extractExecute: jest.SpyInstance<Promise<ExtractedInvoiceResult>, [ExtractInvoiceCommand]>;
  let extractOriginal: (command: ExtractInvoiceCommand) => Promise<ExtractedInvoiceResult>;
  let readExecute: jest.Mock;
  let scanExecute: jest.Mock;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildListItem()]));
    duplicateCheckExecute = jest.fn(() => Promise.resolve([]));
    readExecute = jest.fn(() => Promise.resolve(PDF_READ_RESULT));
    scanExecute = jest.fn(() => Promise.resolve());

    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsGlobalController],
      providers: [
        { provide: ListAllDocumentsUseCase, useValue: { execute: listExecute } },
        { provide: CheckDocumentDuplicateUseCase, useValue: { execute: duplicateCheckExecute } },
        ExtractInvoiceUseCase,
        { provide: PDF_READER, useValue: { read: readExecute } },
        { provide: INVOICE_HINT_REPOSITORY, useValue: { findByIssuer: () => Promise.resolve([]) } },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: () => Promise.resolve(), register: () => {} } },
        { provide: MALWARE_SCANNER, useValue: { scan: scanExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
    const extractInvoiceUseCase = moduleRef.get(ExtractInvoiceUseCase);
    extractOriginal = extractInvoiceUseCase.execute.bind(extractInvoiceUseCase);
    extractExecute = jest.spyOn(extractInvoiceUseCase, 'execute');
  });

  afterEach(() => {
    listExecute.mockClear();
    duplicateCheckExecute.mockClear();
    extractExecute.mockReset();
    extractExecute.mockImplementation(extractOriginal);
    readExecute.mockReset();
    readExecute.mockResolvedValue(PDF_READ_RESULT);
    scanExecute.mockReset();
    scanExecute.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    extractExecute.mockRestore();
    await app.close();
  });

  describe('GET /documents', () => {
    it('returns the global document list contract shape', async () => {
      const response = await request(httpServer).get('/documents');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'doc-1',
          projectId: 'project-1',
          projectName: 'Project One',
          name: 'Invoice 1',
          type: 'factura',
          status: 'pendiente',
          rawStatus: 'pendiente',
          direction: 'gasto',
          date: '2026-06-15',
          dueDate: null,
          amount: 100,
          currency: 'EUR',
          issuerName: 'Acme SL',
          invoiceNumber: 'INV-1',
          supplierId: null,
          staffMemberId: null,
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });

    it('forwards all filters, including projectId, supplierId and staffMemberId, to the use case', async () => {
      await request(httpServer)
        .get('/documents')
        .query({
          search: 'invoice',
          type: 'factura',
          status: 'pendiente',
          direction: 'ingreso',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          amountMin: '10',
          amountMax: '1000',
          projectId: 'project-1',
          supplierId: 'supplier-1',
          staffMemberId: 'staff-1',
        });

      expect(listExecute).toHaveBeenCalledWith({
        search: 'invoice',
        type: 'factura',
        status: 'pendiente',
        direction: 'ingreso',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        amountMin: 10,
        amountMax: 1000,
        projectId: 'project-1',
        supplierId: 'supplier-1',
        staffMemberId: 'staff-1',
      });
    });

    it('returns an empty array when there are no documents', async () => {
      listExecute.mockResolvedValueOnce([]);

      const response = await request(httpServer).get('/documents');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('rejects an invalid type filter', async () => {
      const response = await request(httpServer).get('/documents').query({ type: 'not-a-type' });

      expect(response.status).toBe(400);
      expect(listExecute).not.toHaveBeenCalled();
    });

    it('rejects an invalid direction filter', async () => {
      const response = await request(httpServer).get('/documents').query({ direction: 'not-a-direction' });

      expect(response.status).toBe(400);
      expect(listExecute).not.toHaveBeenCalled();
    });
  });

  describe('GET /documents/duplicate-check', () => {
    it('returns matches in the documented contract shape', async () => {
      duplicateCheckExecute.mockResolvedValueOnce([buildMatch()]);

      const response = await request(httpServer)
        .get('/documents/duplicate-check')
        .query({ invoiceNumber: 'INV-1', amount: '100', issuerTaxId: 'B12345678' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        matches: [
          {
            id: 'doc-1',
            projectId: 'project-1',
            projectName: 'Project One',
            name: 'Invoice 1',
            date: '2026-06-15',
            amount: 100,
          },
        ],
      });
      expect(duplicateCheckExecute).toHaveBeenCalledWith({
        issuerName: undefined,
        issuerTaxId: 'B12345678',
        invoiceNumber: 'INV-1',
        amount: 100,
      });
    });

    it('returns an empty matches array when nothing matches', async () => {
      const response = await request(httpServer)
        .get('/documents/duplicate-check')
        .query({ invoiceNumber: 'INV-404', amount: '50' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ matches: [] });
    });

    it('requires invoiceNumber, returning 400 when it is missing', async () => {
      const response = await request(httpServer)
        .get('/documents/duplicate-check')
        .query({ amount: '100' });

      expect(response.status).toBe(400);
      expect(duplicateCheckExecute).not.toHaveBeenCalled();
    });

    it('requires amount, returning 400 when it is missing', async () => {
      const response = await request(httpServer)
        .get('/documents/duplicate-check')
        .query({ invoiceNumber: 'INV-1' });

      expect(response.status).toBe(400);
      expect(duplicateCheckExecute).not.toHaveBeenCalled();
    });

    it('is not shadowed by any param route and is reachable independently of GET /documents', async () => {
      const response = await request(httpServer)
        .get('/documents/duplicate-check')
        .query({ invoiceNumber: 'INV-1', amount: '100' });

      expect(response.status).toBe(200);
      expect(listExecute).not.toHaveBeenCalled();
    });
  });

  describe('POST /documents/extract', () => {
    it('scans the uploaded buffer before extracting it', async () => {
      const events: string[] = [];
      let scannedBuffer: Buffer | undefined;
      let readBuffer: Buffer | undefined;
      let extractedBuffer: Buffer | undefined;
      scanExecute.mockImplementationOnce((buffer: Buffer) => {
        events.push('scan');
        scannedBuffer = buffer;
      });
      readExecute.mockImplementationOnce((buffer: Buffer) => {
        events.push('read');
        readBuffer = buffer;
        return Promise.resolve(PDF_READ_RESULT);
      });
      extractExecute.mockImplementationOnce(async (command: ExtractInvoiceCommand) => {
        const result = await extractOriginal(command);
        events.push('extract');
        extractedBuffer = command.fileBuffer;
        return result;
      });

      const response = await request(httpServer)
        .post('/documents/extract')
        .attach('file', PDF_HEADER, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(201);
      expect(events).toEqual(['scan', 'read', 'extract']);
      expect(scanExecute).toHaveBeenCalledWith(expect.any(Buffer));
      expect(readExecute).toHaveBeenCalledWith(expect.any(Buffer));
      expect(extractedBuffer).toBe(scannedBuffer);
      expect(readBuffer).toBe(scannedBuffer);
      expect(extractExecute).toHaveBeenCalledTimes(1);
    });

    it('does not extract a file when the malware scanner rejects it', async () => {
      scanExecute.mockRejectedValueOnce(new MalwareDetectedException());

      const response = await request(httpServer)
        .post('/documents/extract')
        .attach('file', PDF_HEADER, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        code: 'MALWARE_DETECTED',
        message: 'The uploaded file was rejected by the malware scanner',
      });
      expect(readExecute).not.toHaveBeenCalled();
      expect(extractExecute).not.toHaveBeenCalled();
    });

    it('does not read or extract a file when the malware scanner is unavailable', async () => {
      scanExecute.mockRejectedValueOnce(new MalwareScannerUnavailableException());

      const response = await request(httpServer)
        .post('/documents/extract')
        .attach('file', PDF_HEADER, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        code: 'MALWARE_SCANNER_UNAVAILABLE',
        message: 'The malware scanner is currently unavailable',
      });
      expect(readExecute).not.toHaveBeenCalled();
      expect(extractExecute).not.toHaveBeenCalled();
    });

    it('requires a file', async () => {
      const response = await request(httpServer).post('/documents/extract');

      expect(response.status).toBe(400);
      expect(extractExecute).not.toHaveBeenCalled();
    });

    it('rejects a file that is not a PDF', async () => {
      const response = await request(httpServer)
        .post('/documents/extract')
        .attach('file', Buffer.from('not a pdf'), { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(extractExecute).not.toHaveBeenCalled();
    });
  });
});
