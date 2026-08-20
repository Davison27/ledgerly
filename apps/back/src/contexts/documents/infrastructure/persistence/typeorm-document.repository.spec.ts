import { Repository } from 'typeorm';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';
import { DocumentOrmEntity } from './document.orm-entity';
import { todayIso } from '../../../../shared/infrastructure/system-clock';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';

interface RecordedCondition {
  sql: string;
  params?: Record<string, unknown>;
}

interface QueryBuilderStub {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  take: jest.Mock;
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
    addOrderBy: jest.fn(() => queryBuilder),
    take: jest.fn(() => queryBuilder),
    getMany: jest.fn().mockResolvedValue([]),
  };

  return { queryBuilder, andWhereCalls };
}

function createStoredFileCipherForTest(): StoredFileCipher {
  return createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, 1)]]),
  });
}

function createRepository(
  queryBuilder: unknown,
  storedFileCipher: StoredFileCipher = createStoredFileCipherForTest(),
): TypeOrmDocumentRepository {
  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as Repository<DocumentOrmEntity>;

  return new TypeOrmDocumentRepository(ormRepository, storedFileCipher);
}

function createStoredDocumentRepository(document: DocumentOrmEntity): {
  repository: TypeOrmDocumentRepository;
  ormRepository: { createQueryBuilder: jest.Mock; delete: jest.Mock; update: jest.Mock };
  queryBuilder: { addSelect: jest.Mock; select: jest.Mock; where: jest.Mock };
} {
  const queryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn().mockResolvedValue(document),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn((_criteria: unknown, values: Partial<DocumentOrmEntity>) => {
      Object.assign(document, values);
      return Promise.resolve({ affected: 1 });
    }),
  };

  return {
    repository: new TypeOrmDocumentRepository(
      ormRepository as unknown as Repository<DocumentOrmEntity>,
      createStoredFileCipherForTest(),
    ),
    ormRepository,
    queryBuilder,
  };
}

function buildStoredDocument(): DocumentOrmEntity {
  return {
    id: 'document-1',
    mimeType: 'application/pdf',
    fileSize: 4,
    contentCiphertext: null,
    contentNonce: null,
    contentTag: null,
    contentKeyVersion: null,
  } as DocumentOrmEntity;
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

  describe('direction filtering', () => {
    it('findAllForListing filters by direction in SQL', async () => {
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findAllForListing({ direction: 'ingreso' });

      const directionCondition = andWhereCalls.find((call) =>
        call.sql.includes('document.direction'),
      );
      expect(directionCondition).toBeDefined();
      expect(directionCondition!.sql.trim()).toBe('document.direction = :direction');
      expect(directionCondition!.params).toEqual({ direction: 'ingreso' });
    });

    it('findByProject filters by direction in SQL', async () => {
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findByProject('project-1', { direction: 'gasto' });

      const directionCondition = andWhereCalls.find((call) =>
        call.sql.includes('document.direction'),
      );
      expect(directionCondition).toBeDefined();
      expect(directionCondition!.sql.trim()).toBe('document.direction = :direction');
      expect(directionCondition!.params).toEqual({ direction: 'gasto' });
    });

    it('does not add a direction condition when no direction filter is given', async () => {
      const { queryBuilder, andWhereCalls } = createQueryBuilderStub();
      const repository = createRepository(queryBuilder);

      await repository.findAllForListing({});

      expect(andWhereCalls.some((call) => call.sql.includes('document.direction'))).toBe(false);
    });
  });

  describe('stored content', () => {
    it('encrypts persisted document bytes and decrypts the complete explicitly selected envelope', async () => {
      const document = buildStoredDocument();
      const { repository, ormRepository, queryBuilder } = createStoredDocumentRepository(document);
      const plaintext = Buffer.from('%PDF');

      await repository.saveContent(document.id, plaintext);

      expect(document.contentCiphertext).not.toEqual(plaintext);
      expect(document.contentNonce).toHaveLength(12);
      expect(document.contentTag).toHaveLength(16);
      expect(document.contentKeyVersion).toBe('v1');
      expect(await repository.findContent(document.id)).toEqual(plaintext);
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('document.contentCiphertext');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('document.contentNonce');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('document.contentTag');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('document.contentKeyVersion');
      expect(ormRepository.update).toHaveBeenCalledTimes(1);
    });

    it('returns null when every encrypted envelope field is null', async () => {
      const document = buildStoredDocument();
      const { repository } = createStoredDocumentRepository(document);

      await expect(repository.findContent(document.id)).resolves.toBeNull();
    });

    it.each(['contentCiphertext', 'contentNonce', 'contentTag', 'contentKeyVersion'] as const)(
      'rejects a partial encrypted envelope missing %s',
      async (missingField) => {
        const document = buildStoredDocument();
        const { repository } = createStoredDocumentRepository(document);
        await repository.saveContent(document.id, Buffer.from('%PDF'));
        Object.assign(document, { [missingField]: null });

        await expect(repository.findContent(document.id)).rejects.toThrow(StoredFileCryptographyException);
      },
    );

    it.each(['contentCiphertext', 'contentNonce', 'contentTag'] as const)(
      'rejects tampering with %s',
      async (field) => {
        const document = buildStoredDocument();
        const { repository } = createStoredDocumentRepository(document);
        await repository.saveContent(document.id, Buffer.from('%PDF'));
        document[field] = Buffer.from(document[field] as Buffer);
        document[field][0] ^= 0xff;

        await expect(repository.findContent(document.id)).rejects.toThrow(StoredFileCryptographyException);
      },
    );

    it.each([
      ['mimeType', 'image/png'],
      ['fileSize', 3],
      ['contentKeyVersion', 'v2'],
    ] as const)('rejects tampering with persisted %s metadata', async (field, value) => {
      const document = buildStoredDocument();
      const { repository } = createStoredDocumentRepository(document);
      await repository.saveContent(document.id, Buffer.from('%PDF'));
      Object.assign(document, { [field]: value });

      await expect(repository.findContent(document.id)).rejects.toThrow(StoredFileCryptographyException);
    });

    it('rejects an envelope transplanted to a different row', async () => {
      const document = buildStoredDocument();
      const { repository } = createStoredDocumentRepository(document);
      await repository.saveContent(document.id, Buffer.from('%PDF'));
      document.id = 'document-2';

      await expect(repository.findContent(document.id)).rejects.toThrow(StoredFileCryptographyException);
    });

    it('accepts a document exactly at the central plaintext limit', async () => {
      const document = buildStoredDocument();
      document.fileSize = STORED_FILE_PLAINTEXT_LIMITS.document;
      const { repository } = createStoredDocumentRepository(document);
      const plaintext = Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.document, 1);

      await repository.saveContent(document.id, plaintext);

      const decrypted = await repository.findContent(document.id);

      expect(decrypted?.equals(plaintext)).toBe(true);
    });

    it('rejects a document one byte over the central plaintext limit before persistence', async () => {
      const document = buildStoredDocument();
      document.fileSize = STORED_FILE_PLAINTEXT_LIMITS.document + 1;
      const { repository, ormRepository } = createStoredDocumentRepository(document);

      await expect(
        repository.saveContent(document.id, Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.document + 1)),
      ).rejects.toThrow(StoredFileCryptographyException);

      expect(ormRepository.update).not.toHaveBeenCalled();
    });

    it('deletes only a document belonging to the supplied project', async () => {
      const document = buildStoredDocument();
      const { repository, ormRepository } = createStoredDocumentRepository(document);
      await repository.saveContent(document.id, Buffer.from('%PDF'));
      const encryptedRow = {
        ciphertext: Buffer.from(document.contentCiphertext!),
        nonce: Buffer.from(document.contentNonce!),
        tag: Buffer.from(document.contentTag!),
        version: document.contentKeyVersion,
      };
      ormRepository.delete.mockResolvedValueOnce({ affected: 0 });

      await expect(repository.delete(document.id, 'project-2')).resolves.toBe(false);
      expect(ormRepository.delete).toHaveBeenCalledWith({ id: document.id, projectId: 'project-2' });
      expect(document.contentCiphertext).toEqual(encryptedRow.ciphertext);
      expect(document.contentNonce).toEqual(encryptedRow.nonce);
      expect(document.contentTag).toEqual(encryptedRow.tag);
      expect(document.contentKeyVersion).toBe(encryptedRow.version);

      await expect(repository.delete(document.id, 'project-1')).resolves.toBe(true);
      expect(ormRepository.delete).toHaveBeenLastCalledWith({ id: document.id, projectId: 'project-1' });
    });
  });
});
