import { Repository } from 'typeorm';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { CompanyDocumentOrmEntity } from './company-document.orm-entity';
import { TypeOrmCompanyDocumentRepository } from './typeorm-company-document.repository';

function buildRow(): CompanyDocumentOrmEntity {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    typeId: '00000000-0000-0000-0000-000000000002',
    name: 'Policy',
    issueDate: null,
    expiryDate: null,
    notes: null,
    fileName: 'policy.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
    contentCiphertext: null,
    contentNonce: null,
    contentTag: null,
    contentKeyVersion: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createRepository(row: CompanyDocumentOrmEntity): {
  repository: TypeOrmCompanyDocumentRepository;
  ormRepository: { delete: jest.Mock; findOne: jest.Mock; update: jest.Mock };
} {
  const queryBuilder = {
    addSelect: jest.fn(),
    select: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn().mockResolvedValue(row),
  };
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockResolvedValue(row),
    update: jest.fn((_criteria: unknown, values: Partial<CompanyDocumentOrmEntity>) => {
      Object.assign(row, values);
      return Promise.resolve({ affected: 1 });
    }),
  };
  const cipher = createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, 1)]]),
  });

  return {
    repository: new TypeOrmCompanyDocumentRepository(
      ormRepository as unknown as Repository<CompanyDocumentOrmEntity>,
      cipher,
    ),
    ormRepository,
  };
}

describe('TypeOrmCompanyDocumentRepository', () => {
  it('encrypts PDF bytes and decrypts the complete company-document envelope', async () => {
    const row = buildRow();
    const { repository } = createRepository(row);
    const plaintext = Buffer.from('%PDF-');

    await repository.saveContent(row.id, plaintext);

    expect(row.contentCiphertext).not.toEqual(plaintext);
    expect(row.contentNonce).toHaveLength(12);
    expect(row.contentTag).toHaveLength(16);
    expect(row.contentKeyVersion).toBe('v1');
    await expect(repository.findContent(row.id)).resolves.toEqual(plaintext);
  });

  it('rejects a tampered company-document ciphertext', async () => {
    const row = buildRow();
    const { repository } = createRepository(row);
    await repository.saveContent(row.id, Buffer.from('%PDF-'));
    row.contentCiphertext![0] ^= 0xff;

    await expect(repository.findContent(row.id)).rejects.toThrow(StoredFileCryptographyException);
  });

  it('rejects content above the central company-document limit before persistence', async () => {
    const row = buildRow();
    row.fileSize = STORED_FILE_PLAINTEXT_LIMITS.companyDocument + 1;
    const { repository, ormRepository } = createRepository(row);

    await expect(
      repository.saveContent(row.id, Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.companyDocument + 1)),
    ).rejects.toThrow(StoredFileCryptographyException);
    expect(ormRepository.update).not.toHaveBeenCalled();
  });

  it('returns false when an atomic delete affects no rows', async () => {
    const row = buildRow();
    const { repository, ormRepository } = createRepository(row);
    ormRepository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(repository.delete(row.id)).resolves.toBe(false);
    expect(ormRepository.delete).toHaveBeenCalledWith({ id: row.id });
  });
});
