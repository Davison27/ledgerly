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
               COALESCE(SUM(amount) FILTER (WHERE direction = 'income'), 0) AS income,
               COALESCE(SUM(amount) FILTER (WHERE direction = 'expense'), 0) AS expenses
        FROM documents
        WHERE deleted_at IS NULL
        GROUP BY project_id, currency
        UNION ALL
        SELECT le.project_id AS "projectId", p.currency, 0,
               COALESCE(SUM(le.amount), 0)
        FROM project_equipment_lease_expenses le
        JOIN projects p ON p.id = le.project_id
        GROUP BY le.project_id, p.currency
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
