import { ListProjectsUseCase } from './list-projects.use-case';
import { ProjectFinancialsRow } from '../../domain/project-financials';
import { ProjectFinancialsProvider } from '../../domain/project-financials-provider.port';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';

class InMemoryProjectRepository implements ProjectRepository {
  constructor(private readonly summaries: ProjectSummary[]) {}

  findAllSummaries(): Promise<ProjectSummary[]> {
    return Promise.resolve(this.summaries);
  }

  findSummaryById(id: string): Promise<ProjectSummary | null> {
    return Promise.resolve(this.summaries.find((summary) => summary.id === id) ?? null);
  }

  findById(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  findByCode(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<ProjectDashboardRow[]> {
    return Promise.resolve([]);
  }
}

class InMemoryProjectFinancialsProvider implements ProjectFinancialsProvider {
  constructor(private readonly rows: ProjectFinancialsRow[]) {}

  findAll(): Promise<ProjectFinancialsRow[]> {
    return Promise.resolve(this.rows);
  }
}

function buildSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Acme Project',
    code: 'ACME-001',
    currency: 'EUR',
    financials: [],
    documentCount: 2,
    pendingCount: 1,
    image: null,
    color: null,
    ...overrides,
  };
}

describe('ListProjectsUseCase', () => {
  it('composes financials for every project without mixing currencies', async () => {
    const projectRepository = new InMemoryProjectRepository([buildSummary()]);
    const financialsProvider = new InMemoryProjectFinancialsProvider([
      { projectId: 'project-1', currency: 'USD', income: 200, expenses: 50 },
      { projectId: 'project-1', currency: 'EUR', income: 100, expenses: 20 },
      { projectId: 'project-2', currency: 'EUR', income: 999, expenses: 999 },
    ]);
    const useCase = new ListProjectsUseCase(projectRepository, financialsProvider);

    const result = await useCase.execute();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'project-1',
        financials: [
          { currency: 'EUR', income: 100, expenses: 20, profit: 80, margin: 0.8 },
          { currency: 'USD', income: 200, expenses: 50, profit: 150, margin: 0.75 },
        ],
      }),
    ]);
  });

  it('keeps the project currency when it has no financial rows', async () => {
    const useCase = new ListProjectsUseCase(
      new InMemoryProjectRepository([buildSummary({ currency: 'GBP' })]),
      new InMemoryProjectFinancialsProvider([]),
    );

    const result = await useCase.execute();

    expect(result[0].financials).toEqual([
      { currency: 'GBP', income: 0, expenses: 0, profit: 0, margin: null },
    ]);
  });
});
