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
import { UpdateDocumentUseCase } from '../../application/update-document/update-document.use-case';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from '../../application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionFeedbackCommand } from '../../application/record-extraction-feedback/record-extraction-feedback.command';
import { RecordExtractionOutcomeUseCase } from '../../application/record-extraction-outcome/record-extraction-outcome.use-case';
import { RecordExtractionOutcomeCommand } from '../../application/record-extraction-outcome/record-extraction-outcome.command';
import { CreateDocumentCommand } from '../../application/create-document/create-document.command';
import { Document } from '../../domain/document';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { MALWARE_SCANNER } from '../../../../shared/domain/malware-scanner.port';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '../pdf/__fixtures__', name));
}

const BASE_PAYLOAD = {
  name: 'Invoice',
  type: 'factura',
  month: 6,
  date: '2026-06-01',
  amount: 100,
  status: 'pendiente',
  direction: 'gasto',
};

describe('DocumentsController file upload/download (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let createExecute: jest.Mock<Promise<Document>, [CreateDocumentCommand]>;
  let getFileExecute: jest.Mock;
  let recordFeedbackExecute: jest.Mock<Promise<void>, [RecordExtractionFeedbackCommand]>;
  let recordOutcomeExecute: jest.Mock<Promise<void>, [RecordExtractionOutcomeCommand]>;

  beforeAll(async () => {
    createExecute = jest.fn((command: CreateDocumentCommand) =>
      Promise.resolve(
        Document.create({
          id: 'doc-1',
          projectId: command.projectId,
          name: command.name,
          type: command.type,
          month: command.month,
          date: command.date,
          amount: command.amount,
          status: command.status,
          issuerName: command.issuerName ?? null,
          issuerTaxId: command.issuerTaxId ?? null,
          invoiceNumber: command.invoiceNumber ?? null,
          dueDate: command.dueDate ?? null,
          taxBase: command.taxBase ?? null,
          taxRate: command.taxRate ?? null,
          taxAmount: command.taxAmount ?? null,
          irpfRate: command.irpfRate ?? null,
          irpfAmount: command.irpfAmount ?? null,
          currency: command.currency ?? 'EUR',
          fileName: command.file?.originalName ?? null,
          mimeType: command.file?.mimeType ?? null,
          fileSize: command.file?.size ?? null,
          supplierId: command.supplierId ?? null,
          direction: command.direction,
        }),
      ),
    );

    getFileExecute = jest.fn();
    recordFeedbackExecute = jest.fn<Promise<void>, [RecordExtractionFeedbackCommand]>().mockResolvedValue(undefined);
    recordOutcomeExecute = jest.fn<Promise<void>, [RecordExtractionOutcomeCommand]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: ListDocumentsUseCase, useValue: {} },
        { provide: GetDocumentUseCase, useValue: {} },
        { provide: CreateDocumentUseCase, useValue: { execute: createExecute } },
        { provide: UpdateDocumentUseCase, useValue: {} },
        { provide: DeleteDocumentUseCase, useValue: {} },
        { provide: ExtractInvoiceUseCase, useValue: {} },
        { provide: GetDocumentFileUseCase, useValue: { execute: getFileExecute } },
        { provide: RecordExtractionFeedbackUseCase, useValue: { execute: recordFeedbackExecute } },
        { provide: RecordExtractionOutcomeUseCase, useValue: { execute: recordOutcomeExecute } },
        { provide: MALWARE_SCANNER, useValue: { scan: () => Promise.resolve() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    createExecute.mockClear();
    getFileExecute.mockClear();
    recordFeedbackExecute.mockClear();
    recordOutcomeExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:projectId/documents (multipart)', () => {
    it('stores the uploaded PDF and returns hasFile + metadata when a file part is sent', async () => {
      const pdf = loadFixture('facturx-invoice.pdf');

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD))
        .attach('file', pdf, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(201);
      const body = response.body as {
        hasFile: boolean;
        fileName: string | null;
        fileSize: number | null;
        mimeType: string | null;
      };
      expect(body.hasFile).toBe(true);
      expect(body.fileName).toBe('invoice.pdf');
      expect(body.fileSize).toBe(pdf.length);
      expect(body.mimeType).toBe('application/pdf');

      expect(createExecute).toHaveBeenCalledTimes(1);
      const command = createExecute.mock.calls[0][0];
      expect(command.file?.originalName).toBe('invoice.pdf');
      expect(command.file?.buffer.equals(pdf)).toBe(true);

      expect(recordFeedbackExecute).toHaveBeenCalledTimes(1);
      const feedbackCommand = recordFeedbackExecute.mock.calls[0][0];
      expect(feedbackCommand.fileBuffer.equals(pdf)).toBe(true);

      expect(recordOutcomeExecute).toHaveBeenCalledTimes(1);
      const outcomeCommand = recordOutcomeExecute.mock.calls[0][0];
      expect(outcomeCommand.fileBuffer.equals(pdf)).toBe(true);
    });

    it('creates a document without a file part and reports hasFile: false', async () => {
      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD));

      expect(response.status).toBe(201);
      const body = response.body as { hasFile: boolean; fileName: string | null };
      expect(body.hasFile).toBe(false);
      expect(body.fileName).toBeNull();

      const command = createExecute.mock.calls[0][0];
      expect(command.file).toBeUndefined();
      expect(recordFeedbackExecute).not.toHaveBeenCalled();
      expect(recordOutcomeExecute).not.toHaveBeenCalled();
    });

    it('forwards supplierId to the use-case and echoes it in the response', async () => {
      const supplierId = '11111111-1111-4111-8111-111111111111';

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify({ ...BASE_PAYLOAD, supplierId }));

      expect(response.status).toBe(201);
      const body = response.body as { supplierId: string | null };
      expect(body.supplierId).toBe(supplierId);

      const command = createExecute.mock.calls[0][0];
      expect(command.supplierId).toBe(supplierId);
    });

    it('creates a document without a supplier and reports supplierId: null', async () => {
      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD));

      expect(response.status).toBe(201);
      const body = response.body as { supplierId: string | null };
      expect(body.supplierId).toBeNull();
    });

    it('returns 400 when supplierId is not a valid UUID', async () => {
      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify({ ...BASE_PAYLOAD, supplierId: 'not-a-uuid' }));

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 404 when the use-case reports the supplier does not exist', async () => {
      createExecute.mockRejectedValueOnce(
        new DocumentSupplierNotFoundException('11111111-1111-4111-8111-111111111111'),
      );

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field(
          'payload',
          JSON.stringify({ ...BASE_PAYLOAD, supplierId: '11111111-1111-4111-8111-111111111111' }),
        );

      expect(response.status).toBe(404);
    });

    it('still returns 201 when recording extraction feedback fails', async () => {
      recordFeedbackExecute.mockRejectedValueOnce(new Error('boom'));
      const pdf = loadFixture('facturx-invoice.pdf');

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD))
        .attach('file', pdf, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(201);
      expect(recordFeedbackExecute).toHaveBeenCalledTimes(1);
    });

    it('still returns 201 and still records feedback when recording extraction outcome fails', async () => {
      recordOutcomeExecute.mockRejectedValueOnce(new Error('boom'));
      const pdf = loadFixture('facturx-invoice.pdf');

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD))
        .attach('file', pdf, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(201);
      expect(recordOutcomeExecute).toHaveBeenCalledTimes(1);
      expect(recordFeedbackExecute).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when payload is missing', async () => {
      const response = await request(httpServer).post('/projects/p1/documents');

      expect(response.status).toBe(400);
    });

    it('returns 400 when payload is not valid JSON', async () => {
      const response = await request(httpServer).post('/projects/p1/documents').field('payload', 'not-json');

      expect(response.status).toBe(400);
    });

    it('returns 400 when payload fails DTO validation', async () => {
      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify({ ...BASE_PAYLOAD, month: 13 }));

      expect(response.status).toBe(400);
    });

    it('returns 400 when direction is missing (D11: no silent default)', async () => {
      const payloadWithoutDirection: Record<string, unknown> = { ...BASE_PAYLOAD };
      delete payloadWithoutDirection.direction;

      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(payloadWithoutDirection));

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when the attached file is not a PDF', async () => {
      const response = await request(httpServer)
        .post('/projects/p1/documents')
        .field('payload', JSON.stringify(BASE_PAYLOAD))
        .attach('file', Buffer.from('not a pdf'), { filename: 'notes.txt', contentType: 'text/plain' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /projects/:projectId/documents/:documentId/file', () => {
    it('streams the stored PDF bytes with the right headers', async () => {
      const pdf = loadFixture('facturx-invoice.pdf');
      getFileExecute.mockResolvedValueOnce({
        content: pdf,
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
      });

      const response = await request(httpServer).get('/projects/p1/documents/doc-1/file');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-disposition']).toBe("inline; filename*=UTF-8''invoice.pdf");
      expect(Buffer.compare(response.body as Buffer, pdf)).toBe(0);
      expect(getFileExecute).toHaveBeenCalledWith('doc-1', 'p1');
    });

    it('returns 404 when the document has no stored file', async () => {
      getFileExecute.mockResolvedValueOnce(null);

      const response = await request(httpServer).get('/projects/p1/documents/doc-2/file');

      expect(response.status).toBe(404);
    });
  });
});
