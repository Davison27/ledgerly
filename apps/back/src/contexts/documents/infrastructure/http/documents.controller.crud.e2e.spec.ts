import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DocumentsController } from './documents.controller';
import { ListDocumentsUseCase } from '../../application/list-documents/list-documents.use-case';
import { GetDocumentUseCase } from '../../application/get-document/get-document.use-case';
import { CreateDocumentUseCase } from '../../application/create-document/create-document.use-case';
import { UpdateDocumentUseCase } from '../../application/update-document/update-document.use-case';
import { UpdateDocumentCommand } from '../../application/update-document/update-document.command';
import { DeleteDocumentUseCase } from '../../application/delete-document/delete-document.use-case';
import { ExtractInvoiceUseCase } from '../../application/extract-invoice/extract-invoice.use-case';
import { GetDocumentFileUseCase } from '../../application/get-document-file/get-document-file.use-case';
import { RecordExtractionFeedbackUseCase } from '../../application/record-extraction-feedback/record-extraction-feedback.use-case';
import { RecordExtractionOutcomeUseCase } from '../../application/record-extraction-outcome/record-extraction-outcome.use-case';
import { Document } from '../../domain/document';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildDocument(overrides: Partial<Parameters<typeof Document.create>[0]> = {}): Document {
  return Document.create({
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice',
    type: 'factura',
    month: 6,
    date: '2026-06-01',
    amount: 100,
    status: 'pendiente',
    direction: 'gasto',
    ...overrides,
  });
}

describe('DocumentsController CRUD (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let getExecute: jest.Mock<Promise<Document>, [string]>;
  let updateExecute: jest.Mock<Promise<Document>, [UpdateDocumentCommand]>;
  let deleteExecute: jest.Mock<Promise<void>, [string]>;
  let getFileExecute: jest.Mock;
  let recordFeedbackExecute: jest.Mock;

  beforeAll(async () => {
    getExecute = jest.fn<Promise<Document>, [string]>();
    updateExecute = jest.fn((command: UpdateDocumentCommand) =>
      Promise.resolve(
        buildDocument({
          id: command.id,
          direction: command.direction ?? 'gasto',
        }),
      ),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    getFileExecute = jest.fn().mockResolvedValue(null);
    recordFeedbackExecute = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: ListDocumentsUseCase, useValue: {} },
        { provide: GetDocumentUseCase, useValue: { execute: getExecute } },
        { provide: CreateDocumentUseCase, useValue: {} },
        { provide: UpdateDocumentUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteDocumentUseCase, useValue: { execute: deleteExecute } },
        { provide: ExtractInvoiceUseCase, useValue: {} },
        { provide: GetDocumentFileUseCase, useValue: { execute: getFileExecute } },
        { provide: RecordExtractionFeedbackUseCase, useValue: { execute: recordFeedbackExecute } },
        { provide: RecordExtractionOutcomeUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    getExecute.mockClear();
    updateExecute.mockClear();
    deleteExecute.mockClear();
    getFileExecute.mockClear();
    recordFeedbackExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /projects/:projectId/documents/:id', () => {
    it('returns 200 with the updated document when the payload is valid', async () => {
      const response = await request(httpServer)
        .patch('/projects/p1/documents/doc-1')
        .send({ direction: 'ingreso' });

      expect(response.status).toBe(200);
      const body = response.body as { id: string; direction: string; projectId: string };
      expect(body.id).toBe('doc-1');
      expect(body.direction).toBe('ingreso');
      expect(body.projectId).toBe('project-1');
      expect(updateExecute).toHaveBeenCalledTimes(1);
      const command = updateExecute.mock.calls[0][0];
      expect(command.id).toBe('doc-1');
      expect(command.direction).toBe('ingreso');
    });

    it('returns 400 and does not call the use case when the body carries month (D4 trap door)', async () => {
      const response = await request(httpServer)
        .patch('/projects/p1/documents/doc-1')
        .send({ month: 3 });

      expect(response.status).toBe(400);
      expect(updateExecute).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid direction', async () => {
      const response = await request(httpServer)
        .patch('/projects/p1/documents/doc-1')
        .send({ direction: 'lo-que-sea' });

      expect(response.status).toBe(400);
      expect(updateExecute).not.toHaveBeenCalled();
    });

    it('returns 404 when the use case reports the document does not exist', async () => {
      updateExecute.mockRejectedValueOnce(new DocumentNotFoundException('missing-id'));

      const response = await request(httpServer)
        .patch('/projects/p1/documents/missing-id')
        .send({ direction: 'ingreso' });

      expect(response.status).toBe(404);
    });

    it('returns 400 and does not call the use case when the body carries a file field (C1: file is not editable)', async () => {
      const response = await request(httpServer)
        .patch('/projects/p1/documents/doc-1')
        .send({ fileName: 'x.pdf' });

      expect(response.status).toBe(400);
      expect(updateExecute).not.toHaveBeenCalled();
    });

    it('returns 400 and does not call the use case when the body carries projectId', async () => {
      const response = await request(httpServer)
        .patch('/projects/p1/documents/doc-1')
        .send({ projectId: 'project-2' });

      expect(response.status).toBe(400);
      expect(updateExecute).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /projects/:projectId/documents/:id', () => {
    it('returns 204 on successful delete', async () => {
      const response = await request(httpServer).delete('/projects/p1/documents/doc-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('doc-1');
    });

    it('returns 404 when the use case reports the document does not exist', async () => {
      deleteExecute.mockRejectedValueOnce(new DocumentNotFoundException('missing-id'));

      const response = await request(httpServer).delete('/projects/p1/documents/missing-id');

      expect(response.status).toBe(404);
    });
  });

  it('GET :id devuelve el status derivado y el status crudo por separado', async () => {
    getExecute.mockResolvedValueOnce(
      buildDocument({ status: 'pendiente', dueDate: '2020-01-01' }),
    );

    const response = await request(httpServer).get('/projects/p1/documents/doc-1');

    expect(response.status).toBe(200);
    const body = response.body as { status: string; rawStatus: string };
    expect(body.status).toBe('vencido');
    expect(body.rawStatus).toBe('pendiente');
  });
});
