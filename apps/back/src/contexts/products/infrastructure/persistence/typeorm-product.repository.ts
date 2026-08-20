import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/product';
import { ProductRepository } from '../../domain/product.repository';
import { ProductOrmEntity } from './product.orm-entity';
import { ProductMapper } from './product.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage, encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  private readonly mapper = new ProductMapper();

  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repository: Repository<ProductOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findAll(): Promise<Product[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository
      .createQueryBuilder('product')
      .addSelect([
        'product.imageCiphertext',
        'product.imageNonce',
        'product.imageTag',
        'product.imageKeyVersion',
        'product.imageMimeType',
        'product.imageSize',
      ])
      .orderBy('product.name', 'ASC')
      .take(limit + 1)
      .getMany();

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Products');

    return rows.map((row) => this.mapper.toDomain(row, this.decryptImage(row)));
  }

  async findById(id: string): Promise<Product | null> {
    const orm = await this.findOneWithImage({ id });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async findByName(name: string): Promise<Product | null> {
    const orm = await this.findOneWithImage({ name });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async save(product: Product): Promise<void> {
    const primitives = product.toPrimitives();
    const encryptedImage = encryptStoredImage(primitives.image ?? null, 'productImage', primitives.id, this.storedFileCipher);
    const orm = this.mapper.toOrm(product);
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

  private async findOneWithImage(where: { id: string } | { name: string }): Promise<ProductOrmEntity | null> {
    return this.repository
      .createQueryBuilder('product')
      .addSelect([
        'product.imageCiphertext',
        'product.imageNonce',
        'product.imageTag',
        'product.imageKeyVersion',
        'product.imageMimeType',
        'product.imageSize',
      ])
      .where(where)
      .getOne();
  }

  private decryptImage(orm: ProductOrmEntity): string | null {
    return decryptStoredImage(
      {
        ciphertext: orm.imageCiphertext,
        keyVersion: orm.imageKeyVersion,
        mimeType: orm.imageMimeType,
        nonce: orm.imageNonce,
        size: orm.imageSize,
        tag: orm.imageTag,
      },
      'productImage',
      orm.id,
      this.storedFileCipher,
    );
  }
}
