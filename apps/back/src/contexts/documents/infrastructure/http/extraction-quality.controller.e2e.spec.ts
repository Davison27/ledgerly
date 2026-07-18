import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ExtractionQualityController } from './extraction-quality.controller';
import { GetExtractionQualityUseCase } from '../../application/get-extraction-quality/get-extraction-quality.use-case';
import { ExtractionQualityReport } from '../../application/get-extraction-quality/extraction-quality-report';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

const SAMPLE_REPORT: ExtractionQualityReport = {
  totalExtractions: 7,
  bySource: { facturae: 2, facturx: 1, ubl: 1, heuristic: 3 },
  byConfidence: { high: 4, partial: 2, low: 1 },
  avgCorrectedFields: 0.8571428571428571,
  correctionRate: 0.42857142857142855,
  topHints: [{ issuerName: 'MI EMPRESA SL', field: 'invoiceNumber', occurrences: 5 }],
};

describe('ExtractionQualityController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let getExecute: jest.Mock<Promise<ExtractionQualityReport>, []>;

  beforeAll(async () => {
    getExecute = jest.fn(() => Promise.resolve(SAMPLE_REPORT));

    const moduleRef = await Test.createTestingModule({
      controllers: [ExtractionQualityController],
      providers: [{ provide: GetExtractionQualityUseCase, useValue: { execute: getExecute } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    getExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /extraction-quality', () => {
    it('returns the aggregate report matching the documented contract shape', async () => {
      const response = await request(httpServer).get('/extraction-quality');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalExtractions: 7,
        bySource: { facturae: 2, facturx: 1, ubl: 1, heuristic: 3 },
        byConfidence: { high: 4, partial: 2, low: 1 },
        avgCorrectedFields: 0.8571428571428571,
        correctionRate: 0.42857142857142855,
        topHints: [{ issuerName: 'MI EMPRESA SL', field: 'invoiceNumber', occurrences: 5 }],
      });
      expect(getExecute).toHaveBeenCalledTimes(1);
    });

    it('returns zeros and an empty topHints array for an empty database', async () => {
      getExecute.mockResolvedValueOnce({
        totalExtractions: 0,
        bySource: { facturae: 0, facturx: 0, ubl: 0, heuristic: 0 },
        byConfidence: { high: 0, partial: 0, low: 0 },
        avgCorrectedFields: 0,
        correctionRate: 0,
        topHints: [],
      });

      const response = await request(httpServer).get('/extraction-quality');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalExtractions: 0,
        bySource: { facturae: 0, facturx: 0, ubl: 0, heuristic: 0 },
        byConfidence: { high: 0, partial: 0, low: 0 },
        avgCorrectedFields: 0,
        correctionRate: 0,
        topHints: [],
      });
    });
  });
});
