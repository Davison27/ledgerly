import { readFileSync } from 'fs';
import { join } from 'path';
import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DocumentsController } from './documents.controller';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { UpdateDocumentUseCase } from '../../application/update-document/update-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractInvoiceCommand } from '../../application/extract-invoice/extract-invoice.command';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from '../../application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionOutcomeUseCase } from '../../application/record-extraction-outcome/record-extraction-outcome.use-case';
import { PDF_READER, PdfReadResult, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { INVOICE_HINT_REPOSITORY } from '../../domain/extraction/hints/invoice-hint.repository';
import { PdfjsPdfReader } from '../../infrastructure/pdf/pdfjs-pdf-reader';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../shared/domain/domain-event-publisher.port';
import { MALWARE_SCANNER } from '../../../../shared/domain/malware-scanner.port';
import { MalwareDetectedException } from '../../../../shared/domain/errors/malware-detected.exception';
import { MalwareScannerUnavailableException } from '../../../../shared/domain/errors/malware-scanner-unavailable.exception';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '../pdf/__fixtures__', name));
}

describe('DocumentsController /extract (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let scanExecute: jest.Mock;
  let extractExecute: jest.SpyInstance<Promise<ExtractedInvoiceResult>, [ExtractInvoiceCommand]>;
  let extractOriginal: (command: ExtractInvoiceCommand) => Promise<ExtractedInvoiceResult>;
  let readExecute: jest.SpyInstance<Promise<PdfReadResult>, [Buffer]>;
  let readOriginal: (buffer: Buffer) => Promise<PdfReadResult>;

  beforeAll(async () => {
    scanExecute = jest.fn(() => Promise.resolve());
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: ListDocumentsUseCase, useValue: {} },
        { provide: GetDocumentUseCase, useValue: {} },
        { provide: CreateDocumentUseCase, useValue: {} },
        { provide: UpdateDocumentUseCase, useValue: {} },
        { provide: DeleteDocumentUseCase, useValue: {} },
        { provide: GetDocumentFileUseCase, useValue: {} },
        { provide: RecordExtractionFeedbackUseCase, useValue: {} },
        { provide: RecordExtractionOutcomeUseCase, useValue: {} },
        { provide: ConfigService, useValue: new ConfigService() },
        ExtractInvoiceUseCase,
        { provide: PDF_READER, useClass: PdfjsPdfReader },
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
    const pdfReader = moduleRef.get<PdfReader>(PDF_READER);
    readOriginal = pdfReader.read.bind(pdfReader);
    readExecute = jest.spyOn(pdfReader, 'read');
  });

  afterEach(() => {
    readExecute.mockReset();
    readExecute.mockImplementation(readOriginal);
    scanExecute.mockReset();
    scanExecute.mockResolvedValue(undefined);
    extractExecute.mockReset();
    extractExecute.mockImplementation(extractOriginal);
  });

  afterAll(async () => {
    readExecute.mockRestore();
    extractExecute.mockRestore();
    await app.close();
  });

  it('scans the uploaded buffer before extracting the same buffer', async () => {
    const events: string[] = [];
    let scannedBuffer: Buffer | undefined;
    let readBuffer: Buffer | undefined;
    let extractedBuffer: Buffer | undefined;
    scanExecute.mockImplementationOnce((buffer: Buffer) => {
      events.push('scan');
      scannedBuffer = buffer;
    });
    readExecute.mockImplementationOnce(async (buffer: Buffer) => {
      events.push('read');
      readBuffer = buffer;
      return readOriginal(buffer);
    });
    extractExecute.mockImplementationOnce((command: ExtractInvoiceCommand) => {
      return extractOriginal(command).then((result) => {
        events.push('extract');
        extractedBuffer = command.fileBuffer;
        return result;
      });
    });

    const response = await request(httpServer)
      .post('/projects/p1/documents/extract')
      .attach('file', loadFixture('facturx-invoice.pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });

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
      .post('/projects/p1/documents/extract')
      .attach('file', loadFixture('facturx-invoice.pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });

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
      .post('/projects/p1/documents/extract')
      .attach('file', loadFixture('facturx-invoice.pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'MALWARE_SCANNER_UNAVAILABLE',
      message: 'The malware scanner is currently unavailable',
    });
    expect(readExecute).not.toHaveBeenCalled();
    expect(extractExecute).not.toHaveBeenCalled();
  });

  it('returns 200 with extracted fields for a real Factur-X PDF', async () => {
    const response = await request(httpServer)
      .post('/projects/p1/documents/extract')
      .attach('file', loadFixture('facturx-invoice.pdf'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    const body = response.body as ExtractedInvoiceResult;
    expect(body.source).toBe('facturx');
    expect(body.confidence).toBe('high');
    expect(body.fields.invoiceNumber).toBe('FX-2026-000123');
    expect(body.fields.amount).toBe(1210);
    expect(body.fields.type).toBe('factura');
  });

  it('returns 422 with PDF_NO_TEXT_LAYER for an image-only PDF', async () => {
    const response = await request(httpServer)
      .post('/projects/p1/documents/extract')
      .attach('file', loadFixture('no-text.pdf'), { filename: 'scan.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(422);
    const body = response.body as { message: string };
    expect(body.message).toBe('PDF_NO_TEXT_LAYER');
  });

  it('returns 400 when no file is sent', async () => {
    const response = await request(httpServer).post('/projects/p1/documents/extract');

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-PDF file', async () => {
    const response = await request(httpServer)
      .post('/projects/p1/documents/extract')
      .attach('file', Buffer.from('not a pdf'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
  });
});
