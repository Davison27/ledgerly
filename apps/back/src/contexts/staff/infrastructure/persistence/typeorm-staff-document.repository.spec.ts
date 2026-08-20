import { Repository } from 'typeorm';
import { TypeOrmStaffDocumentRepository } from './typeorm-staff-document.repository';
import { StaffDocumentOrmEntity } from './staff-document.orm-entity';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';

function buildStaffDocument(): StaffDocumentOrmEntity {
  return {
    id: 'staff-document-1',
    mimeType: 'application/pdf',
    fileSize: 4,
    contentCiphertext: null,
    contentNonce: null,
    contentTag: null,
    contentKeyVersion: null,
  } as StaffDocumentOrmEntity;
}

function createRepository(document: StaffDocumentOrmEntity): {
  repository: TypeOrmStaffDocumentRepository;
  ormRepository: { delete: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  queryBuilder: { addSelect: jest.Mock; andWhere: jest.Mock; select: jest.Mock; where: jest.Mock };
} {
  const queryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn().mockResolvedValue(document),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockResolvedValue(document),
    update: jest.fn((_criteria: unknown, values: Partial<StaffDocumentOrmEntity>) => {
      Object.assign(document, values);
      return Promise.resolve({ affected: 1 });
    }),
  };
  const cipher = createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, 1)]]),
  });

  return {
    repository: new TypeOrmStaffDocumentRepository(
      ormRepository as unknown as Repository<StaffDocumentOrmEntity>,
      cipher,
    ),
    ormRepository,
    queryBuilder,
  };
}

describe('TypeOrmStaffDocumentRepository', () => {
  it('encrypts persisted staff-document bytes and decrypts the complete explicitly selected envelope', async () => {
    const document = buildStaffDocument();
    const { repository, queryBuilder } = createRepository(document);
    const plaintext = Buffer.from('%PDF');

    await repository.saveContent(document.id, plaintext);

    expect(document.contentCiphertext).not.toEqual(plaintext);
    expect(document.contentNonce).toHaveLength(12);
    expect(document.contentTag).toHaveLength(16);
    expect(document.contentKeyVersion).toBe('v1');
    expect(await repository.findContent(document.id)).toEqual(plaintext);
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('staffDocument.contentCiphertext');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('staffDocument.contentNonce');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('staffDocument.contentTag');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('staffDocument.contentKeyVersion');
  });

  it('returns null for a missing encrypted envelope', async () => {
    const document = buildStaffDocument();
    const { repository } = createRepository(document);

    await expect(repository.findContent(document.id)).resolves.toBeNull();
  });

  it('rejects a tampered staff-document ciphertext without returning plaintext', async () => {
    const document = buildStaffDocument();
    const { repository } = createRepository(document);
    await repository.saveContent(document.id, Buffer.from('%PDF'));
    document.contentCiphertext![0] ^= 0xff;

    await expect(repository.findContent(document.id)).rejects.toThrow(StoredFileCryptographyException);
  });

  it('rejects a staff document one byte over the central plaintext limit before persistence', async () => {
    const document = buildStaffDocument();
    document.fileSize = STORED_FILE_PLAINTEXT_LIMITS.staffDocument + 1;
    const { repository, ormRepository } = createRepository(document);

    await expect(
      repository.saveContent(document.id, Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.staffDocument + 1)),
    ).rejects.toThrow(StoredFileCryptographyException);

    expect(ormRepository.update).not.toHaveBeenCalled();
  });

  it('scopes nested lookup, content reads, and delete to the staff member', async () => {
    const document = buildStaffDocument();
    const { repository, ormRepository, queryBuilder } = createRepository(document);
    await repository.saveContent(document.id, Buffer.from('%PDF'));

    await repository.findById(document.id, 'staff-member-2');
    await repository.findContent(document.id, 'staff-member-2');
    await repository.delete(document.id, 'staff-member-2');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: document.id, staffMemberId: 'staff-member-2' },
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'staffDocument.staff_member_id = :staffMemberId',
      { staffMemberId: 'staff-member-2' },
    );
    expect(ormRepository.delete).toHaveBeenCalledWith({
      id: document.id,
      staffMemberId: 'staff-member-2',
    });
  });

  it('does not mutate an encrypted row when the scoped delete affects no rows', async () => {
    const document = buildStaffDocument();
    const { repository, ormRepository } = createRepository(document);
    await repository.saveContent(document.id, Buffer.from('%PDF'));
    const encryptedRow = {
      ciphertext: Buffer.from(document.contentCiphertext!),
      nonce: Buffer.from(document.contentNonce!),
      tag: Buffer.from(document.contentTag!),
      version: document.contentKeyVersion,
    };
    ormRepository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(repository.delete(document.id, 'staff-member-2')).resolves.toBe(false);

    expect(ormRepository.delete).toHaveBeenCalledWith({
      id: document.id,
      staffMemberId: 'staff-member-2',
    });
    expect(document.contentCiphertext).toEqual(encryptedRow.ciphertext);
    expect(document.contentNonce).toEqual(encryptedRow.nonce);
    expect(document.contentTag).toEqual(encryptedRow.tag);
    expect(document.contentKeyVersion).toBe(encryptedRow.version);
  });
});
