import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ExtractionHintsController } from './extraction-hints.controller';
import { ListHintsUseCase } from '../../application/list-hints/list-hints.use-case';
import { DeleteHintUseCase } from '../../application/delete-hint/delete-hint.use-case';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

const SAMPLE_HINT: InvoiceHint = {
  id: 'hint-1',
  issuerTaxId: 'B12345678',
  field: 'invoiceNumber',
  anchorKind: 'inline',
  anchorLabel: 'Ref interna',
  lineOffset: 0,
  sampleValue: 'REF-9',
  occurrences: 3,
};

describe('ExtractionHintsController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock<Promise<InvoiceHint[]>, []>;
  let deleteExecute: jest.Mock<Promise<void>, [string]>;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([SAMPLE_HINT]));
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [ExtractionHintsController],
      providers: [
        { provide: ListHintsUseCase, useValue: { execute: listExecute } },
        { provide: DeleteHintUseCase, useValue: { execute: deleteExecute } },
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
    deleteExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /extraction-hints', () => {
    it('returns the hints as a plain DTO array', async () => {
      const response = await request(httpServer).get('/extraction-hints');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'hint-1',
          issuerTaxId: 'B12345678',
          field: 'invoiceNumber',
          anchorKind: 'inline',
          anchorLabel: 'Ref interna',
          lineOffset: 0,
          sampleValue: 'REF-9',
          occurrences: 3,
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /extraction-hints/:id', () => {
    it('returns 204 and forwards the id to the use-case', async () => {
      const response = await request(httpServer).delete('/extraction-hints/hint-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('hint-1');
    });
  });
});
