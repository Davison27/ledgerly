import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_FINANCIALS_PROVIDER,
  ProjectFinancialsProvider,
} from '../../domain/project-financials-provider.port';
import { ProjectFinancialsRow, summarizeFinancials } from '../../domain/project-financials';
import { ProjectSummary } from '../../domain/project-summary';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../domain/project.repository';

@Injectable()
export class ListProjectsUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(PROJECT_FINANCIALS_PROVIDER)
    private readonly projectFinancialsProvider: ProjectFinancialsProvider,
  ) {}

  async execute(): Promise<ProjectSummary[]> {
    const [summaries, financialRows] = await Promise.all([
      this.projectRepository.findAllSummaries(),
      this.projectFinancialsProvider.findAll(),
    ]);
    const rowsByProject = new Map<string, ProjectFinancialsRow[]>();

    for (const row of financialRows) {
      const rows = rowsByProject.get(row.projectId) ?? [];
      rows.push(row);
      rowsByProject.set(row.projectId, rows);
    }

    return summaries.map((summary) => ({
      ...summary,
      financials: summarizeFinancials(rowsByProject.get(summary.id) ?? [], summary.currency),
    }));
  }
}
