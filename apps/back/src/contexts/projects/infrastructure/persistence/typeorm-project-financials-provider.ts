import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ProjectFinancialsProvider,
} from '../../domain/project-financials-provider.port';
import { ProjectFinancialsRow } from '../../domain/project-financials';

@Injectable()
export class TypeOrmProjectFinancialsProvider implements ProjectFinancialsProvider {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<ProjectFinancialsRow[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(`
      SELECT "projectId", currency, SUM(income) AS income, SUM(expenses) AS expenses
      FROM (
        SELECT project_id AS "projectId", currency,
               COALESCE(SUM(amount) FILTER (WHERE direction = 'ingreso'), 0) AS income,
               COALESCE(SUM(amount) FILTER (WHERE direction = 'gasto'), 0) AS expenses
        FROM documents
        GROUP BY project_id, currency
        UNION ALL
        SELECT pp.project_id AS "projectId", p.currency, 0,
               COALESCE(SUM(pp.lease_expense), 0)
        FROM project_products pp
        JOIN projects p ON p.id = pp.project_id
        WHERE pp.lease_expense IS NOT NULL
          AND pp.lease_expense_date IS NOT NULL
        GROUP BY pp.project_id, p.currency
      ) totals
      GROUP BY "projectId", currency
    `);

    return rows.map((row) => ({
      projectId: String(row.projectId),
      currency: String(row.currency),
      income: Number(row.income),
      expenses: Number(row.expenses),
    }));
  }
}
