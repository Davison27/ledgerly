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
import { ProjectEquipmentLeaseExpenseOrmEntity } from './project-equipment-lease-expense.orm-entity';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';

type ProjectEquipmentQueryRow = Record<string, unknown>;

@Injectable()
export class TypeOrmProjectEquipmentRepository implements ProjectEquipmentRepository {
  constructor(
    @InjectRepository(ProjectEquipmentOrmEntity)
    private readonly repository: Repository<ProjectEquipmentOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
    @InjectRepository(ProjectEquipmentLeaseExpenseOrmEntity)
    private readonly leaseExpenseRepository: Repository<ProjectEquipmentLeaseExpenseOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async findByProjectId(projectId: string): Promise<ProjectEquipmentRecord[]> {
    const limit = getListLimit('MAX_PROJECT_EQUIPMENT_PER_PROJECT', 100);
    const rows: ProjectEquipmentQueryRow[] = await this.repository.manager.query(
      `SELECT pe.project_id AS "projectId", pe.equipment_id AS "equipmentId", e.name, e.reference,
        e.category, e.image_ciphertext AS "imageCiphertext", e.image_nonce AS "imageNonce",
        e.image_tag AS "imageTag", e.image_key_version AS "imageKeyVersion",
        e.image_mime_type AS "imageMimeType", e.image_size AS "imageSize", e.leasing_monthly_fee AS "leasingMonthlyFee"
       FROM project_equipment pe
       INNER JOIN equipment e ON e.id = pe.equipment_id
       WHERE pe.project_id = $1
       ORDER BY e.name ASC
       LIMIT $2`,
      [projectId, limit + 1],
    );

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Project equipment');

    const expenses = await this.findLeaseExpensesByProject(projectId);
    const expensesByEquipment = new Map<string, Array<{ id: string; amount: number; date: string }>>();
    for (const expense of expenses) {
      const current = expensesByEquipment.get(expense.equipmentId) ?? [];
      current.push({
        id: expense.id,
        amount: expense.amount,
        date: expense.date,
      });
      expensesByEquipment.set(expense.equipmentId, current);
    }

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
        leaseExpenses: expensesByEquipment.get(String(row.equipmentId)) ?? [],
      };
    }) as ProjectEquipmentRecord[];
  }

  async save(input: Pick<ProjectEquipmentRecord, 'projectId' | 'equipmentId'>): Promise<void> {
    await this.repository.save({
      projectId: input.projectId,
      equipmentId: input.equipmentId,
    });
  }

  async addLeaseExpense(input: { projectId: string; equipmentId: string; amount: number; date: string }): Promise<void> {
    await this.leaseExpenseRepository.save({
      id: this.idGenerator.generate(),
      projectId: input.projectId,
      equipmentId: input.equipmentId,
      amount: input.amount.toString(),
      expenseDate: input.date,
    });
  }

  async findLeaseExpensesByProject(projectId: string): Promise<Array<{ id: string; equipmentId: string; amount: number; date: string }>> {
    const rows = await this.leaseExpenseRepository.find({
      where: { projectId },
      order: { expenseDate: 'ASC', id: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id,
      equipmentId: row.equipmentId,
      amount: Number(row.amount),
      date: row.expenseDate,
    }));
  }

  async deleteLeaseExpense(id: string): Promise<boolean> {
    const result = await this.leaseExpenseRepository.delete(id);

    return result.affected === 1;
  }

  async delete(projectId: string, equipmentId: string): Promise<boolean> {
    const result = await this.repository.delete({ projectId, equipmentId });

    return result.affected === 1;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  async findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    const rows = await this.leaseExpenseRepository.find({ order: { id: 'ASC' } });

    return rows.map((row) => ({
      projectId: row.projectId,
      amount: Number(row.amount),
      date: row.expenseDate,
    }));
  }
}
