import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';
import {
  STORED_FILE_CIPHER,
  StoredFileCipher,
  StoredFileEnvelope,
} from '../../../../shared/domain/stored-file-cipher.port';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentRepository } from '../../domain/company-document.repository';
import { CompanyDocumentMapper } from './company-document.mapper';
import { CompanyDocumentOrmEntity } from './company-document.orm-entity';

@Injectable()
export class TypeOrmCompanyDocumentRepository implements CompanyDocumentRepository {
  constructor(
    @InjectRepository(CompanyDocumentOrmEntity)
    private readonly repository: Repository<CompanyDocumentOrmEntity>,
    @Inject(STORED_FILE_CIPHER)
    private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findAll(typeId?: string): Promise<CompanyDocument[]> {
    const queryBuilder = this.repository.createQueryBuilder('companyDocument');

    if (typeId !== undefined) {
      queryBuilder.where('companyDocument.type_id = :typeId', { typeId });
    }

    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    queryBuilder
      .orderBy('companyDocument.issue_date', 'DESC', 'NULLS LAST')
      .addOrderBy('companyDocument.id', 'DESC')
      .take(limit + 1);

    const rows = await queryBuilder.getMany();
    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Company documents');

    return rows.map((row) => CompanyDocumentMapper.toDomain(row));
  }

  async findById(id: string): Promise<CompanyDocument | null> {
    const row = await this.repository.findOne({ where: { id } });

    return row === null ? null : CompanyDocumentMapper.toDomain(row);
  }

  async save(document: CompanyDocument): Promise<void> {
    await this.repository.save(CompanyDocumentMapper.toOrm(document));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });

    return result.affected === 1;
  }

  async saveContent(documentId: string, content: Buffer): Promise<void> {
    const row = await this.repository
      .createQueryBuilder('companyDocument')
      .select(['companyDocument.id', 'companyDocument.mimeType', 'companyDocument.fileSize'])
      .where('companyDocument.id = :documentId', { documentId })
      .getOne();

    if (row === null) {
      throw new StoredFileCryptographyException();
    }

    const envelope = this.storedFileCipher.encrypt(content, {
      store: 'companyDocument',
      rowId: row.id,
      mimeType: row.mimeType,
      plaintextSize: row.fileSize,
    });
    const result = await this.repository.update(
      { id: documentId },
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

  async findContent(documentId: string): Promise<Buffer | null> {
    const row = await this.repository
      .createQueryBuilder('companyDocument')
      .select(['companyDocument.id', 'companyDocument.mimeType', 'companyDocument.fileSize'])
      .addSelect('companyDocument.contentCiphertext')
      .addSelect('companyDocument.contentNonce')
      .addSelect('companyDocument.contentTag')
      .addSelect('companyDocument.contentKeyVersion')
      .where('companyDocument.id = :documentId', { documentId })
      .getOne();

    if (row === null) {
      return null;
    }

    const envelope = this.getContentEnvelope(row);
    if (envelope === null) {
      return null;
    }

    return this.storedFileCipher.decrypt(envelope, {
      store: 'companyDocument',
      rowId: row.id,
      mimeType: row.mimeType,
      plaintextSize: row.fileSize,
    });
  }

  private getContentEnvelope(row: CompanyDocumentOrmEntity): StoredFileEnvelope | null {
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
