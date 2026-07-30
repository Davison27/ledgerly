import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectLeaseExpenseRow,
  ProjectProductRecord,
  ProjectProductRepository,
} from '../../domain/project-product.repository';
import { ProjectProductOrmEntity } from './project-product.orm-entity';

@Injectable()
export class TypeOrmProjectProductRepository implements ProjectProductRepository {
  constructor(
    @InjectRepository(ProjectProductOrmEntity)
    private readonly repository: Repository<ProjectProductOrmEntity>,
  ) {}

  async findByProjectId(projectId: string): Promise<ProjectProductRecord[]> {
    const rows = await this.repository.manager.query(
      `SELECT pp.project_id AS "projectId", pp.product_id AS "productId", p.name, p.reference,
        p.category, p.image, p.leasing_monthly_fee AS "leasingMonthlyFee",
        pp.lease_expense AS "leaseExpense", pp.lease_expense_date AS "leaseExpenseDate"
       FROM project_products pp
       INNER JOIN products p ON p.id = pp.product_id
       WHERE pp.project_id = $1
       ORDER BY p.name ASC`,
      [projectId],
    );

    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      leasingMonthlyFee: row.leasingMonthlyFee === null ? null : Number(row.leasingMonthlyFee),
      leaseExpense: row.leaseExpense === null ? null : Number(row.leaseExpense),
    })) as ProjectProductRecord[];
  }

  async save(input: Pick<ProjectProductRecord, 'projectId' | 'productId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void> {
    await this.repository.save({
      projectId: input.projectId,
      productId: input.productId,
      leaseExpense: input.leaseExpense?.toString() ?? null,
      leaseExpenseDate: input.leaseExpenseDate,
    });
  }

  async delete(projectId: string, productId: string): Promise<void> {
    await this.repository.delete({ projectId, productId });
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  async findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    const rows = await this.repository.createQueryBuilder('projectProduct')
      .select('projectProduct.project_id', 'projectId')
      .addSelect('projectProduct.lease_expense', 'amount')
      .addSelect('projectProduct.lease_expense_date', 'date')
      .where('projectProduct.lease_expense IS NOT NULL')
      .andWhere('projectProduct.lease_expense_date IS NOT NULL')
      .getRawMany();

    return rows.map((row) => ({ projectId: row.projectId, amount: Number(row.amount), date: row.date }));
  }
}
