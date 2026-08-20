import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectLeaseExpenseRow,
  ProjectProductRecord,
  ProjectProductRepository,
} from '../../domain/project-product.repository';
import { ProjectProductOrmEntity } from './project-product.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

type ProjectProductQueryRow = Record<string, unknown>;

@Injectable()
export class TypeOrmProjectProductRepository implements ProjectProductRepository {
  constructor(
    @InjectRepository(ProjectProductOrmEntity)
    private readonly repository: Repository<ProjectProductOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findByProjectId(projectId: string): Promise<ProjectProductRecord[]> {
    const limit = getListLimit('MAX_PROJECT_PRODUCTS_PER_PROJECT', 100);
    const rows: ProjectProductQueryRow[] = await this.repository.manager.query(
      `SELECT pp.project_id AS "projectId", pp.product_id AS "productId", p.name, p.reference,
        p.category, p.image_ciphertext AS "imageCiphertext", p.image_nonce AS "imageNonce",
        p.image_tag AS "imageTag", p.image_key_version AS "imageKeyVersion",
        p.image_mime_type AS "imageMimeType", p.image_size AS "imageSize", p.leasing_monthly_fee AS "leasingMonthlyFee",
        pp.lease_expense AS "leaseExpense", pp.lease_expense_date AS "leaseExpenseDate"
       FROM project_products pp
       INNER JOIN products p ON p.id = pp.product_id
       WHERE pp.project_id = $1
       ORDER BY p.name ASC
       LIMIT $2`,
      [projectId, limit + 1],
    );

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Project products');

    return rows.map((row) => {
      const { imageCiphertext, imageKeyVersion, imageMimeType, imageNonce, imageSize, imageTag, ...product } = row;
      const image = decryptStoredImage(
        {
          ciphertext: imageCiphertext as Buffer | null,
          keyVersion: imageKeyVersion as string | null,
          mimeType: imageMimeType as string | null,
          nonce: imageNonce as Buffer | null,
          size: imageSize as number | null,
          tag: imageTag as Buffer | null,
        },
        'productImage',
        String(row.productId),
        this.storedFileCipher,
      );

      return {
        ...product,
        image,
        leasingMonthlyFee: row.leasingMonthlyFee === null ? null : Number(row.leasingMonthlyFee),
        leaseExpense: row.leaseExpense === null ? null : Number(row.leaseExpense),
      };
    }) as ProjectProductRecord[];
  }

  async save(input: Pick<ProjectProductRecord, 'projectId' | 'productId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void> {
    await this.repository.save({
      projectId: input.projectId,
      productId: input.productId,
      leaseExpense: input.leaseExpense?.toString() ?? null,
      leaseExpenseDate: input.leaseExpenseDate,
    });
  }

  async delete(projectId: string, productId: string): Promise<boolean> {
    const result = await this.repository.delete({ projectId, productId });

    return result.affected === 1;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  async findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    const rows: Array<{ projectId: string; amount: string | number; date: string }> = await this.repository.createQueryBuilder('projectProduct')
      .select('projectProduct.project_id', 'projectId')
      .addSelect('projectProduct.lease_expense', 'amount')
      .addSelect('projectProduct.lease_expense_date', 'date')
      .where('projectProduct.lease_expense IS NOT NULL')
      .andWhere('projectProduct.lease_expense_date IS NOT NULL')
      .getRawMany();

    return rows.map((row) => ({ projectId: row.projectId, amount: Number(row.amount), date: row.date }));
  }
}
