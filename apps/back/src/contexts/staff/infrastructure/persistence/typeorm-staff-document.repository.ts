import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocumentOrmEntity } from './staff-document.orm-entity';
import { StaffDocumentMapper } from './staff-document.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import {
  STORED_FILE_CIPHER,
  StoredFileCipher,
  StoredFileEnvelope,
} from '../../../../shared/domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';

@Injectable()
export class TypeOrmStaffDocumentRepository implements StaffDocumentRepository {
  constructor(
    @InjectRepository(StaffDocumentOrmEntity)
    private readonly repository: Repository<StaffDocumentOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findByStaffMember(staffMemberId: string, typeId?: string): Promise<StaffDocument[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('staffDocument')
      .where('staffDocument.staff_member_id = :staffMemberId', { staffMemberId });

    if (typeId) {
      queryBuilder.andWhere('staffDocument.type_id = :typeId', { typeId });
    }

    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    queryBuilder.orderBy('staffDocument.issue_date', 'DESC').addOrderBy('staffDocument.id', 'DESC').take(limit + 1);

    const orms = await queryBuilder.getMany();

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Staff documents');

    return orms.map((orm) => StaffDocumentMapper.toDomain(orm));
  }

  async findById(id: string, staffMemberId?: string): Promise<StaffDocument | null> {
    const orm = await this.repository.findOne({
      where: staffMemberId === undefined ? { id } : { id, staffMemberId },
    });

    return orm ? StaffDocumentMapper.toDomain(orm) : null;
  }

  async save(staffDocument: StaffDocument): Promise<void> {
    await this.repository.save(StaffDocumentMapper.toOrm(staffDocument));
  }

  async delete(id: string, staffMemberId?: string): Promise<boolean> {
    const result = await this.repository.delete(
      staffMemberId === undefined ? { id } : { id, staffMemberId },
    );

    return result.affected === 1;
  }

  async saveContent(staffDocumentId: string, content: Buffer): Promise<void> {
    const orm = await this.repository
      .createQueryBuilder('staffDocument')
      .select(['staffDocument.id', 'staffDocument.mimeType', 'staffDocument.fileSize'])
      .where('staffDocument.id = :staffDocumentId', { staffDocumentId })
      .getOne();

    if (!orm) {
      throw new StoredFileCryptographyException();
    }

    const envelope = this.storedFileCipher.encrypt(content, {
      store: 'staffDocument',
      rowId: orm.id,
      mimeType: orm.mimeType,
      plaintextSize: orm.fileSize,
    });
    const result = await this.repository.update(
      { id: staffDocumentId },
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

  async findContent(staffDocumentId: string, staffMemberId?: string): Promise<Buffer | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('staffDocument')
      .select(['staffDocument.id', 'staffDocument.mimeType', 'staffDocument.fileSize'])
      .addSelect('staffDocument.contentCiphertext')
      .addSelect('staffDocument.contentNonce')
      .addSelect('staffDocument.contentTag')
      .addSelect('staffDocument.contentKeyVersion')
      .where('staffDocument.id = :staffDocumentId', { staffDocumentId });

    if (staffMemberId !== undefined) {
      queryBuilder.andWhere('staffDocument.staff_member_id = :staffMemberId', { staffMemberId });
    }

    const orm = await queryBuilder.getOne();

    if (!orm) {
      return null;
    }

    const envelope = this.getContentEnvelope(orm);

    if (!envelope) {
      return null;
    }

    return this.storedFileCipher.decrypt(envelope, {
      store: 'staffDocument',
      rowId: orm.id,
      mimeType: orm.mimeType,
      plaintextSize: orm.fileSize,
    });
  }

  private getContentEnvelope(orm: StaffDocumentOrmEntity): StoredFileEnvelope | null {
    const values = [orm.contentCiphertext, orm.contentNonce, orm.contentTag, orm.contentKeyVersion];

    if (values.every((value) => value === null)) {
      return null;
    }

    if (values.some((value) => value === null)) {
      throw new StoredFileCryptographyException();
    }

    return {
      ciphertext: orm.contentCiphertext as Buffer,
      nonce: orm.contentNonce as Buffer,
      tag: orm.contentTag as Buffer,
      version: orm.contentKeyVersion as string,
    };
  }
}
