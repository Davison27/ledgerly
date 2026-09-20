import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { Company } from '../../domain/company';
import { CompanyRepository } from '../../domain/company.repository';
import { CompanyMapper } from './company.mapper';
import { CompanyOrmEntity } from './company.orm-entity';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage, encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

@Injectable()
export class TypeOrmCompanyRepository implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyOrmEntity)
    private readonly repository: Repository<CompanyOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async find(): Promise<Company | null> {
    const orm = await this.repository
      .createQueryBuilder('company')
      .addSelect([
        'company.logoCiphertext',
        'company.logoNonce',
        'company.logoTag',
        'company.logoKeyVersion',
        'company.logoMimeType',
        'company.logoSize',
      ])
      .orderBy('company.id', 'ASC')
      .getOne();

    if (!orm) {
      return null;
    }

    return CompanyMapper.toDomain(
      orm,
      decryptStoredImage(
        {
          ciphertext: orm.logoCiphertext,
          nonce: orm.logoNonce,
          tag: orm.logoTag,
          keyVersion: orm.logoKeyVersion,
          mimeType: orm.logoMimeType,
          size: orm.logoSize,
        },
        'companyLogo',
        orm.id,
        this.storedFileCipher,
      ),
    );
  }

  async save(company: Company): Promise<void> {
    const primitives = company.toPrimitives();
    const encryptedImage = encryptStoredImage(primitives.logo, 'companyLogo', primitives.id, this.storedFileCipher);
    const orm = CompanyMapper.toOrm(company);
    orm.logoCiphertext = encryptedImage.envelope.ciphertext ?? null;
    orm.logoNonce = encryptedImage.envelope.nonce ?? null;
    orm.logoTag = encryptedImage.envelope.tag ?? null;
    orm.logoKeyVersion = encryptedImage.envelope.keyVersion ?? null;
    orm.logoMimeType = encryptedImage.envelope.mimeType ?? null;
    orm.logoSize = encryptedImage.envelope.size ?? null;
    try {
      await this.repository.save(orm);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError?.code ===
          '23505' &&
        (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError?.constraint ===
          'UQ_companies_singleton'
      ) {
        throw new UniqueConstraintException('Company', 'singleton', 'true');
      }

      throw error;
    }
  }
}
