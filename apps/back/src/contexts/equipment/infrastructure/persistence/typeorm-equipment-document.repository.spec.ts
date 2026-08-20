import { Repository } from 'typeorm';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';
import { EquipmentDocumentOrmEntity } from './equipment-document.orm-entity';
import { TypeOrmEquipmentDocumentRepository } from './typeorm-equipment-document.repository';

function buildRow(): EquipmentDocumentOrmEntity {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    equipmentId: '00000000-0000-0000-0000-000000000002',
    name: 'Inspection report',
    issueDate: null,
    expiryDate: null,
    notes: null,
    fileName: 'inspection.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
    contentCiphertext: null,
    contentNonce: null,
    contentTag: null,
    contentKeyVersion: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createRepository(row: EquipmentDocumentOrmEntity): {
  repository: TypeOrmEquipmentDocumentRepository;
  ormRepository: { delete: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  queryBuilder: Record<string, jest.Mock>;
} {
  const queryBuilder: Record<string, jest.Mock> = {
    addOrderBy: jest.fn(),
    addSelect: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn().mockResolvedValue([row]),
    getOne: jest.fn().mockResolvedValue(row),
    orderBy: jest.fn(),
    select: jest.fn(),
    take: jest.fn(),
    where: jest.fn(),
  };

  for (const method of ['addOrderBy', 'addSelect', 'andWhere', 'orderBy', 'select', 'take', 'where']) {
    queryBuilder[method].mockReturnValue(queryBuilder);
  }

  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockResolvedValue(row),
    update: jest.fn((_criteria: unknown, values: Partial<EquipmentDocumentOrmEntity>) => {
      Object.assign(row, values);
      return Promise.resolve({ affected: 1 });
    }),
  };
  const cipher = createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, 1)]]),
  });

  return {
    repository: new TypeOrmEquipmentDocumentRepository(
      ormRepository as unknown as Repository<EquipmentDocumentOrmEntity>,
      cipher,
    ),
    ormRepository,
    queryBuilder,
  };
}

describe('TypeOrmEquipmentDocumentRepository', () => {
  it('encrypts PDF bytes and decrypts the complete equipment-document envelope', async () => {
    const row = buildRow();
    const { repository, queryBuilder } = createRepository(row);
    const plaintext = Buffer.from('%PDF-');

    await repository.saveContent(row.equipmentId, row.id, plaintext);

    expect(row.contentCiphertext).not.toEqual(plaintext);
    expect(row.contentNonce).toHaveLength(12);
    expect(row.contentTag).toHaveLength(16);
    expect(row.contentKeyVersion).toBe('v1');
    await expect(repository.findContent(row.equipmentId, row.id)).resolves.toEqual(plaintext);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'equipmentDocument.id = :documentId',
      { documentId: row.id },
    );
  });

  it('rejects a partial envelope without attempting a plaintext fallback', async () => {
    const row = buildRow();
    row.contentCiphertext = Buffer.from('ciphertext');
    const { repository } = createRepository(row);

    await expect(repository.findContent(row.equipmentId, row.id)).rejects.toThrow(StoredFileCryptographyException);
  });

  it('rejects content above the future equipment-document limit before persistence', async () => {
    const row = buildRow();
    const { repository, ormRepository } = createRepository(row);
    const content = Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.equipmentDocument + 1);

    await expect(repository.saveContent(row.equipmentId, row.id, content)).rejects.toThrow(
      StoredFileCryptographyException,
    );
    expect(ormRepository.update).not.toHaveBeenCalled();
  });

  it('scopes nested item lookup, content reads, and delete to both route identifiers', async () => {
    const row = buildRow();
    const { repository, ormRepository, queryBuilder } = createRepository(row);

    await repository.findById('equipment-2', row.id);
    await repository.findContent('equipment-2', row.id);
    await repository.delete('equipment-2', row.id);

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: row.id, equipmentId: 'equipment-2' },
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'equipmentDocument.equipment_id = :equipmentId',
      { equipmentId: 'equipment-2' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'equipmentDocument.id = :documentId',
      { documentId: row.id },
    );
    expect(ormRepository.delete).toHaveBeenCalledWith({ id: row.id, equipmentId: 'equipment-2' });
  });

  it('uses the affected-row result for atomic scoped deletion', async () => {
    const row = buildRow();
    const { repository, ormRepository } = createRepository(row);
    ormRepository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(repository.delete(row.equipmentId, row.id)).resolves.toBe(false);
    expect(ormRepository.delete).toHaveBeenCalledWith({ id: row.id, equipmentId: row.equipmentId });
  });
});
