import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../documents/domain/document.repository';
import { deriveEffectiveStatus } from '../../../documents/domain/effective-status';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../projects/domain/project.repository';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import {
  DashboardDataProvider,
  DashboardDocumentRow,
  DashboardProjectRow,
  DashboardProjectSummary,
} from '../../domain/dashboard-data-provider.port';

/**
 * The only place in `dashboard` allowed to know about `documents` and
 * `projects`' domains (see `invoices/infrastructure/company` for the same
 * pattern): it resolves each document's effective status here, so
 * `GetCompanyDashboardUseCase` never has to import `documents/domain` just
 * to re-derive what `dashboard/domain/dashboard-data-provider.port.ts`
 * already promises to hand it pre-resolved.
 */
@Injectable()
export class RepositoryDashboardDataProvider implements DashboardDataProvider {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async findAllDocumentRows(): Promise<DashboardDocumentRow[]> {
    const rows = await this.documentRepository.findAllForDashboard();
    const todayIso = this.clock.todayIso();

    return rows.map((row) => ({
      type: row.type,
      amount: row.amount,
      month: row.month,
      status: deriveEffectiveStatus(row.status, row.dueDate, todayIso),
      issuerName: row.issuerName,
      projectId: row.projectId,
      date: row.date,
      dueDate: row.dueDate,
      taxAmount: row.taxAmount,
      direction: row.direction,
    }));
  }

  async findAllProjectSummaries(): Promise<DashboardProjectSummary[]> {
    const summaries = await this.projectRepository.findAllSummaries();

    return summaries.map((summary) => ({ id: summary.id, name: summary.name }));
  }

  findAllProjectRows(): Promise<DashboardProjectRow[]> {
    return this.projectRepository.findAllForDashboard();
  }
}
