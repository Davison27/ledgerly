import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  STORED_FILE_CIPHER,
  StoredFileCipher,
  StoredFileEnvelope,
} from '../../../../shared/domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import { assertStoredFilePlaintextSize } from '../../../../shared/infrastructure/crypto/stored-file-policy';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentDocumentMapper } from './equipment-document.mapper';
import { EquipmentDocumentOrmEntity } from './equipment-document.orm-entity';

@Injectable()
export class TypeOrmEquipmentDocumentRepository implements EquipmentDocumentRepository {
  constructor(
    @InjectRepository(EquipmentDocumentOrmEntity)
    private readonly repository: Repository<EquipmentDocumentOrmEntity>,
    @Inject(STORED_FILE_CIPHER)
    private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findByEquipment(equipmentId: string): Promise<EquipmentDocument[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository
      .createQueryBuilder('equipmentDocument')
      .where('equipmentDocument.equipment_id = :equipmentId', { equipmentId })
      .orderBy('equipmentDocument.issue_date', 'DESC', 'NULLS LAST')
      .addOrderBy('equipmentDocument.id', 'DESC')
      .take(limit + 1)
      .getMany();

    if (rows.length > limit) {
      throw new ListLimitExceededException(limit, 'Equipment documents');
    }

    return rows.map((row) => EquipmentDocumentMapper.toDomain(row));
  }

  async findById(equipmentId: string, documentId: string): Promise<EquipmentDocument | null> {
    const row = await this.repository.findOne({ where: { id: documentId, equipmentId } });

    return row === null ? null : EquipmentDocumentMapper.toDomain(row);
  }

  async save(document: EquipmentDocument): Promise<void> {
    await this.repository.save(EquipmentDocumentMapper.toOrm(document));
  }

  async delete(equipmentId: string, documentId: string): Promise<boolean> {
    const result = await this.repository.delete({ id: documentId, equipmentId });

    return result.affected === 1;
  }

  async saveContent(equipmentId: string, documentId: string, content: Buffer): Promise<void> {
    const row = await this.repository
      .createQueryBuilder('equipmentDocument')
      .select(['equipmentDocument.id', 'equipmentDocument.mimeType', 'equipmentDocument.fileSize'])
      .where('equipmentDocument.equipment_id = :equipmentId', { equipmentId })
      .andWhere('equipmentDocument.id = :documentId', { documentId })
      .getOne();

    if (row === null) {
      throw new StoredFileCryptographyException();
    }

    assertStoredFilePlaintextSize('equipmentDocument', content.length);
    const envelope = this.storedFileCipher.encrypt(content, {
      store: 'equipmentDocument',
      rowId: row.id,
      mimeType: row.mimeType,
      plaintextSize: row.fileSize,
    });
    const result = await this.repository.update(
      { id: documentId, equipmentId },
      {
        contentCiphertext: envelope.ciphertext,
        contentNonce: envelope.nonce,
        contentTag: envelope.tag,
        contentKeyVersion: envelope.version,
      },
    );

    if (result.affected !== 1) {
      throw new StoredFileCryptographyException();
    }
  }

  async findContent(equipmentId: string, documentId: string): Promise<Buffer | null> {
    const row = await this.repository
      .createQueryBuilder('equipmentDocument')
      .select(['equipmentDocument.id', 'equipmentDocument.mimeType', 'equipmentDocument.fileSize'])
      .addSelect('equipmentDocument.contentCiphertext')
      .addSelect('equipmentDocument.contentNonce')
      .addSelect('equipmentDocument.contentTag')
      .addSelect('equipmentDocument.contentKeyVersion')
      .where('equipmentDocument.equipment_id = :equipmentId', { equipmentId })
      .andWhere('equipmentDocument.id = :documentId', { documentId })
      .getOne();

    if (row === null) {
      return null;
    }

    const envelope = this.getContentEnvelope(row);

    if (envelope === null) {
      return null;
    }

    return this.storedFileCipher.decrypt(envelope, {
      store: 'equipmentDocument',
      rowId: row.id,
      mimeType: row.mimeType,
      plaintextSize: row.fileSize,
    });
  }

  private getContentEnvelope(row: EquipmentDocumentOrmEntity): StoredFileEnvelope | null {
    const values = [row.contentCiphertext, row.contentNonce, row.contentTag, row.contentKeyVersion];

    if (values.every((value) => value === null)) {
      return null;
    }

    if (values.some((value) => value === null)) {
      throw new StoredFileCryptographyException();
    }

    return {
      ciphertext: row.contentCiphertext as Buffer,
      nonce: row.contentNonce as Buffer,
      tag: row.contentTag as Buffer,
      version: row.contentKeyVersion as string,
    };
  }
}
