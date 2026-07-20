import { Repository } from 'typeorm';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';
import { DocumentOrmEntity } from './document.orm-entity';
import { todayIso } from '../../domain/effective-status';

interface RecordedCondition {
  sql: string;
  params?: Record<string, unknown>;
}

interface QueryBuilderStub {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  getMany: jest.Mock;
}

function createQueryBuilderStub(): { queryBuilder: QueryBuilderStub; andWhereCalls: RecordedCondition[] } {
  const andWhereCalls: RecordedCondition[] = [];
  const queryBuilder: QueryBuilderStub = {
    where: jest.fn((sql: string, params?: Record<string, unknown>) => {
      andWhereCalls.push({ sql, params });
      return queryBuilder;
    }),
    andWhere: jest.fn((sql: string, params?: Record<string, unknown>) => {
      andWhereCalls.push({ sql, params });
      return queryBuilder;
    }),
    orderBy: jest.fn(() => queryBuilder),
    getMany: jest.fn().mockResolvedValue([]),
  };

  return { queryBuilder, andWhereCalls };
}

function createRepository(queryBuilder: unknown): TypeOrmDocumentRepository {
  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as Repository<DocumentOrmEntity>;

  return new TypeOrmDocumentRepository(ormRepository);
}

function mockToday(isoDate: string): void {
  jest.useFakeTimers().setSystemTime(new Date(isoDate));
}

describe('TypeOrmDocumentRepository', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('status filtering', () => {
    it('findAllForListing filters by the derived status in SQL, not by the raw stored column', async () => {
      mockToday('2026-07-20T10:00:00.000Z');
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findAllForListing({ status: 'vencido' });

      expect(
        andWhereCalls.some((call) => call.sql.trim() === 'document.status = :status'),
      ).toBe(false);

      const statusCondition = andWhereCalls.find((call) => call.sql.includes('CASE WHEN'));
      expect(statusCondition).toBeDefined();
      expect(statusCondition!.sql).toContain("document.status = 'pendiente'");
      expect(statusCondition!.sql).toContain('document.due_date IS NOT NULL');
      expect(statusCondition!.sql).toContain('document.due_date < :today');
      expect(statusCondition!.sql).not.toContain('<=');
      expect(statusCondition!.params).toEqual({ status: 'vencido', today: todayIso() });
    });

    it('findByProject filters by the derived status in SQL, not by the raw stored column', async () => {
      mockToday('2026-07-20T10:00:00.000Z');
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findByProject('project-1', { status: 'pendiente' });

      expect(
        andWhereCalls.some((call) => call.sql.trim() === 'document.status = :status'),
      ).toBe(false);

      const statusCondition = andWhereCalls.find((call) => call.sql.includes('CASE WHEN'));
      expect(statusCondition).toBeDefined();
      expect(statusCondition!.sql).toContain("document.status = 'pendiente'");
      expect(statusCondition!.sql).toContain('document.due_date IS NOT NULL');
      expect(statusCondition!.sql).toContain('document.due_date < :today');
      expect(statusCondition!.sql).not.toContain('<=');
      expect(statusCondition!.params).toEqual({ status: 'pendiente', today: todayIso() });
    });

    it('does not add a status condition when no status filter is given', async () => {
      mockToday('2026-07-20T10:00:00.000Z');
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findAllForListing({});

      expect(andWhereCalls.some((call) => call.sql.includes('CASE WHEN'))).toBe(false);
    });
  });
});
