import { readFileSync } from 'fs';
import { join } from 'path';
import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DocumentsController } from './documents.controller';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { ExtractedInvoiceResult } from '../../application/extract-invoice/extracted-invoice';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from '../../application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionOutcomeUseCase } from '../../application/record-extraction-outcome/record-extraction-outcome.use-case';
import { PDF_READER } from '../../domain/extraction/pdf-reader.port';
import { INVOICE_HINT_REPOSITORY } from '../../domain/extraction/hints/invoice-hint.repository';
import { PdfjsPdfReader } from '../../infrastructure/pdf/pdfjs-pdf-reader';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '../pdf/__fixtures__', name));
}

describe('DocumentsController /extract (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        // Not exercised by these tests, but required by the controller's constructor.
        { provide: ListDocumentsUseCase, useValue: {} },
        { provide: GetDocumentUseCase, useValue: {} },
        { provide: CreateDocumentUseCase, useValue: {} },
        { provide: DeleteDocumentUseCase, useValue: {} },
        { provide: GetDocumentFileUseCase, useValue: {} },
        { provide: RecordExtractionFeedbackUseCase, useValue: {} },
        { provide: RecordExtractionOutcomeUseCase, useValue: {} },
        ExtractInvoiceUseCase,
        { provide: PDF_READER, useClass: PdfjsPdfReader },
        { provide: INVOICE_HINT_REPOSITORY, useValue: { findByIssuer: () => Promise.resolve([]) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
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
