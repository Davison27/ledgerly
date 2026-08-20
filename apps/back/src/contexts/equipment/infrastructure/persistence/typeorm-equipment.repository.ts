import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../../domain/equipment';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentOrmEntity } from './equipment.orm-entity';
import { EquipmentMapper } from './equipment.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage, encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

@Injectable()
export class TypeOrmEquipmentRepository implements EquipmentRepository {
  private readonly mapper = new EquipmentMapper();

  constructor(
    @InjectRepository(EquipmentOrmEntity)
    private readonly repository: Repository<EquipmentOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findAll(): Promise<Equipment[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository
      .createQueryBuilder('equipment')
      .addSelect([
        'equipment.imageCiphertext',
        'equipment.imageNonce',
        'equipment.imageTag',
        'equipment.imageKeyVersion',
        'equipment.imageMimeType',
        'equipment.imageSize',
      ])
      .orderBy('equipment.name', 'ASC')
      .take(limit + 1)
      .getMany();

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Equipment');

    return rows.map((row) => this.mapper.toDomain(row, this.decryptImage(row)));
  }

  async findById(id: string): Promise<Equipment | null> {
    const orm = await this.findOneWithImage({ id });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async findByName(name: string): Promise<Equipment | null> {
    const orm = await this.findOneWithImage({ name });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async save(equipment: Equipment): Promise<void> {
    const primitives = equipment.toPrimitives();
    const encryptedImage = encryptStoredImage(primitives.image ?? null, 'equipmentImage', primitives.id, this.storedFileCipher);
    const orm = this.mapper.toOrm(equipment);
    orm.imageCiphertext = encryptedImage.envelope.ciphertext ?? null;
    orm.imageNonce = encryptedImage.envelope.nonce ?? null;
    orm.imageTag = encryptedImage.envelope.tag ?? null;
    orm.imageKeyVersion = encryptedImage.envelope.keyVersion ?? null;
    orm.imageMimeType = encryptedImage.envelope.mimeType ?? null;
    orm.imageSize = encryptedImage.envelope.size ?? null;
    await this.repository.save(orm);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private async findOneWithImage(where: { id: string } | { name: string }): Promise<EquipmentOrmEntity | null> {
    return this.repository
      .createQueryBuilder('equipment')
      .addSelect([
        'equipment.imageCiphertext',
        'equipment.imageNonce',
        'equipment.imageTag',
        'equipment.imageKeyVersion',
        'equipment.imageMimeType',
        'equipment.imageSize',
      ])
      .where(where)
      .getOne();
  }

  private decryptImage(orm: EquipmentOrmEntity): string | null {
    return decryptStoredImage(
      {
        ciphertext: orm.imageCiphertext,
        keyVersion: orm.imageKeyVersion,
        mimeType: orm.imageMimeType,
        nonce: orm.imageNonce,
        size: orm.imageSize,
        tag: orm.imageTag,
      },
      'equipmentImage',
      orm.id,
      this.storedFileCipher,
    );
  }
}
