import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DocumentsGlobalController } from './documents-global.controller';
import { ListAllDocumentsUseCase } from '../../application/list-all-documents/list-all-documents.use-case';
import { CheckDocumentDuplicateUseCase } from '../../application/check-document-duplicate/check-document-duplicate.use-case';
import { DocumentListItem } from '../../application/list-all-documents/document-list-item';
import { DocumentDuplicateMatch } from '../../application/check-document-duplicate/document-duplicate-match';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildListItem(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    projectName: 'Project One',
    name: 'Invoice 1',
    type: 'factura',
    status: 'pendiente',
    date: '2026-06-15',
    dueDate: null,
    amount: 100,
    currency: 'EUR',
    issuerName: 'Acme SL',
    invoiceNumber: 'INV-1',
    supplierId: null,
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

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildListItem()]));
    duplicateCheckExecute = jest.fn(() => Promise.resolve([]));

    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsGlobalController],
      providers: [
        { provide: ListAllDocumentsUseCase, useValue: { execute: listExecute } },
        { provide: CheckDocumentDuplicateUseCase, useValue: { execute: duplicateCheckExecute } },
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
    duplicateCheckExecute.mockClear();
  });

  afterAll(async () => {
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
          date: '2026-06-15',
          dueDate: null,
          amount: 100,
          currency: 'EUR',
          issuerName: 'Acme SL',
          invoiceNumber: 'INV-1',
          supplierId: null,
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });

    it('forwards all filters, including projectId and supplierId, to the use case', async () => {
      await request(httpServer)
        .get('/documents')
        .query({
          search: 'invoice',
          type: 'factura',
          status: 'pendiente',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          amountMin: '10',
          amountMax: '1000',
          projectId: 'project-1',
          supplierId: 'supplier-1',
        });

      expect(listExecute).toHaveBeenCalledWith({
        search: 'invoice',
        type: 'factura',
        status: 'pendiente',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        amountMin: 10,
        amountMax: 1000,
        projectId: 'project-1',
        supplierId: 'supplier-1',
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
});
