import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectLeaseExpenseRow,
  ProjectEquipmentRecord,
  ProjectEquipmentRepository,
} from '../../domain/project-equipment.repository';
import { ProjectEquipmentOrmEntity } from './project-equipment.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

type ProjectEquipmentQueryRow = Record<string, unknown>;

@Injectable()
export class TypeOrmProjectEquipmentRepository implements ProjectEquipmentRepository {
  constructor(
    @InjectRepository(ProjectEquipmentOrmEntity)
    private readonly repository: Repository<ProjectEquipmentOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findByProjectId(projectId: string): Promise<ProjectEquipmentRecord[]> {
    const limit = getListLimit('MAX_PROJECT_EQUIPMENT_PER_PROJECT', 100);
    const rows: ProjectEquipmentQueryRow[] = await this.repository.manager.query(
      `SELECT pe.project_id AS "projectId", pe.equipment_id AS "equipmentId", e.name, e.reference,
        e.category, e.image_ciphertext AS "imageCiphertext", e.image_nonce AS "imageNonce",
        e.image_tag AS "imageTag", e.image_key_version AS "imageKeyVersion",
        e.image_mime_type AS "imageMimeType", e.image_size AS "imageSize", e.leasing_monthly_fee AS "leasingMonthlyFee",
        pe.lease_expense AS "leaseExpense", pe.lease_expense_date AS "leaseExpenseDate"
       FROM project_equipment pe
       INNER JOIN equipment e ON e.id = pe.equipment_id
       WHERE pe.project_id = $1
       ORDER BY e.name ASC
       LIMIT $2`,
      [projectId, limit + 1],
    );

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Project equipment');

    return rows.map((row) => {
      const { imageCiphertext, imageKeyVersion, imageMimeType, imageNonce, imageSize, imageTag, ...equipment } = row;
      const image = decryptStoredImage(
        {
          ciphertext: imageCiphertext as Buffer | null,
          keyVersion: imageKeyVersion as string | null,
          mimeType: imageMimeType as string | null,
          nonce: imageNonce as Buffer | null,
          size: imageSize as number | null,
          tag: imageTag as Buffer | null,
        },
        'equipmentImage',
        String(row.equipmentId),
        this.storedFileCipher,
      );

      return {
        ...equipment,
        image,
        leasingMonthlyFee: row.leasingMonthlyFee === null ? null : Number(row.leasingMonthlyFee),
        leaseExpense: row.leaseExpense === null ? null : Number(row.leaseExpense),
      };
    }) as ProjectEquipmentRecord[];
  }

  async save(input: Pick<ProjectEquipmentRecord, 'projectId' | 'equipmentId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void> {
    await this.repository.save({
      projectId: input.projectId,
      equipmentId: input.equipmentId,
      leaseExpense: input.leaseExpense?.toString() ?? null,
      leaseExpenseDate: input.leaseExpenseDate,
    });
  }

  async delete(projectId: string, equipmentId: string): Promise<boolean> {
    const result = await this.repository.delete({ projectId, equipmentId });

    return result.affected === 1;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  async findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    const rows: Array<{ projectId: string; amount: string | number; date: string }> = await this.repository.createQueryBuilder('projectEquipment')
      .select('projectEquipment.project_id', 'projectId')
      .addSelect('projectEquipment.lease_expense', 'amount')
      .addSelect('projectEquipment.lease_expense_date', 'date')
      .where('projectEquipment.lease_expense IS NOT NULL')
      .andWhere('projectEquipment.lease_expense_date IS NOT NULL')
      .getRawMany();

    return rows.map((row) => ({ projectId: row.projectId, amount: Number(row.amount), date: row.date }));
  }
}
